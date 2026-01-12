import { useState, useCallback } from 'react';
import type { Section } from '../utils/sectionDetector';
import type { LoopRegion } from './useBeatSync';
import { extendToMeasureBoundary, getMeasureDuration } from '../utils/measureUtils';

interface UseSectionSelectionOptions {
  /** Detected sections */
  sections: Section[];
  /** BPM from analysis */
  bpm: number;
  /** Music start time in seconds */
  musicStartTime: number;
  /** Beats per measure (time signature numerator) */
  beatsPerMeasure: number;
  /** Total duration in seconds */
  duration: number;
  /** Callback to merge sections (from useSectionDetection) */
  mergeSections: (indexA: number, indexB: number) => void;
  /** Callback to split a section (from useSectionDetection) */
  splitSection: (index: number, splitTime: number) => void;
  /** Callback to set loop region (from useBeatSync) */
  setLoopRegion: (region: LoopRegion | null) => void;
  /** Callback to enable/disable looping (from useBeatSync) */
  setLoopEnabled: (enabled: boolean) => void;
  /** Callback to seek to a time (from useBeatSync) */
  seek: (time: number) => void;
  /** Current loop region (from useBeatSync) */
  loopRegion: LoopRegion | null;
}

interface UseSectionSelectionReturn {
  /** Currently selected section IDs */
  selectedSectionIds: string[];
  /** Select a section (with optional shift-extend) */
  selectSection: (section: Section, extendSelection?: boolean) => void;
  /** Clear all selection */
  clearSelection: () => void;
  /** Set up loop for entire track */
  loopEntireTrack: () => void;
  /** Combine multiple selected sections into one */
  combineSelected: () => void;
  /** Split a section at a specific time */
  splitAtTime: (sectionId: string, splitTime: number) => void;
  /** Extend or shrink selection by measures */
  extendSelection: (direction: 'start' | 'end', deltaMeasures: number) => void;
  /** Reset selection state (call when file changes) */
  resetSelection: () => void;
}

/**
 * Hook to manage section selection and loop region logic.
 * Consolidates section selection, multi-select, combine/split operations,
 * and loop region management.
 */
export function useSectionSelection({
  sections,
  bpm,
  musicStartTime,
  beatsPerMeasure,
  duration,
  mergeSections,
  splitSection,
  setLoopRegion,
  setLoopEnabled,
  seek,
  loopRegion,
}: UseSectionSelectionOptions): UseSectionSelectionReturn {
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);

  /**
   * Select a section, optionally extending to create a range selection.
   * Loop regions are extended to nearest measure boundaries for smoother musical transitions.
   */
  const selectSection = useCallback(
    (section: Section, extendSelection: boolean = false) => {
      if (extendSelection && selectedSectionIds.length > 0) {
        // Extend selection to include range from first selected to clicked section
        const clickedIndex = sections.findIndex(s => s.id === section.id);
        const selectedIndices = selectedSectionIds.map(id => sections.findIndex(s => s.id === id));
        const minSelected = Math.min(...selectedIndices);
        const maxSelected = Math.max(...selectedIndices);

        // Determine the new range
        let newStart: number, newEnd: number;
        if (clickedIndex < minSelected) {
          newStart = clickedIndex;
          newEnd = maxSelected;
        } else if (clickedIndex > maxSelected) {
          newStart = minSelected;
          newEnd = clickedIndex;
        } else {
          // Clicked within range, keep existing selection
          newStart = minSelected;
          newEnd = maxSelected;
        }

        // Select all sections in range
        const newIds = sections.slice(newStart, newEnd + 1).map(s => s.id);
        setSelectedSectionIds(newIds);

        // Update loop region to span all selected sections, extended to measure boundaries
        const firstSection = sections[newStart];
        const lastSection = sections[newEnd];
        const loopStart = extendToMeasureBoundary(firstSection.startTime, 'start', bpm, musicStartTime, beatsPerMeasure);
        const loopEnd = extendToMeasureBoundary(lastSection.endTime, 'end', bpm, musicStartTime, beatsPerMeasure, duration);
        setLoopRegion({
          startTime: loopStart,
          endTime: loopEnd,
        });
        seek(loopStart);
      } else {
        // Single selection - extend to measure boundaries for smoother loops
        setSelectedSectionIds([section.id]);
        const loopStart = extendToMeasureBoundary(section.startTime, 'start', bpm, musicStartTime, beatsPerMeasure);
        const loopEnd = extendToMeasureBoundary(section.endTime, 'end', bpm, musicStartTime, beatsPerMeasure, duration);
        setLoopRegion({
          startTime: loopStart,
          endTime: loopEnd,
        });
        seek(loopStart);
      }
    },
    [sections, selectedSectionIds, seek, setLoopRegion, bpm, musicStartTime, beatsPerMeasure, duration]
  );

  /** Clear all section selection and disable looping */
  const clearSelection = useCallback(() => {
    setSelectedSectionIds([]);
    setLoopRegion(null);
    setLoopEnabled(false);
  }, [setLoopRegion, setLoopEnabled]);

  /** Set up loop for the entire track (from music start to end) */
  const loopEntireTrack = useCallback(() => {
    setSelectedSectionIds([]);
    setLoopRegion({
      startTime: musicStartTime,
      endTime: duration,
    });
    setLoopEnabled(true);
  }, [musicStartTime, duration, setLoopRegion, setLoopEnabled]);

  /** Combine all selected sections into one merged section */
  const combineSelected = useCallback(() => {
    if (selectedSectionIds.length < 2) return;

    // Find indices of selected sections and sort them
    const indices = selectedSectionIds
      .map(id => sections.findIndex(s => s.id === id))
      .filter(i => i >= 0)
      .sort((a, b) => a - b);

    if (indices.length < 2) return;

    // Merge from the end to avoid index shifting issues
    for (let i = indices.length - 1; i > 0; i--) {
      mergeSections(indices[i - 1], indices[i]);
    }

    // Select the merged section (first index)
    const newSection = sections[indices[0]];
    if (newSection) {
      setSelectedSectionIds([newSection.id]);
    }
  }, [selectedSectionIds, sections, mergeSections]);

  /** Split a section at a specific time */
  const splitAtTime = useCallback(
    (sectionId: string, splitTime: number) => {
      const sectionIndex = sections.findIndex(s => s.id === sectionId);
      if (sectionIndex < 0) return;

      splitSection(sectionIndex, splitTime);

      // Clear selection after split
      setSelectedSectionIds([]);
    },
    [sections, splitSection]
  );

  /** Extend or shrink the loop region by a number of measures */
  const extendSelection = useCallback(
    (direction: 'start' | 'end', deltaMeasures: number) => {
      if (!loopRegion) return;

      const measureDuration = getMeasureDuration(bpm, beatsPerMeasure);

      let newStart = loopRegion.startTime;
      let newEnd = loopRegion.endTime;

      if (direction === 'start') {
        // delta > 0 means move start later (shrink from start)
        // delta < 0 means move start earlier (extend from start)
        newStart = Math.max(musicStartTime, loopRegion.startTime + deltaMeasures * measureDuration);
      } else {
        // delta > 0 means move end later (extend from end)
        // delta < 0 means move end earlier (shrink from end)
        newEnd = Math.min(duration, loopRegion.endTime + deltaMeasures * measureDuration);
      }

      // Ensure minimum 1 measure length
      if (newEnd - newStart < measureDuration) return;

      setLoopRegion({ startTime: newStart, endTime: newEnd });
    },
    [loopRegion, bpm, beatsPerMeasure, musicStartTime, duration, setLoopRegion]
  );

  /** Reset selection state (call when file changes) */
  const resetSelection = useCallback(() => {
    setSelectedSectionIds([]);
  }, []);

  return {
    selectedSectionIds,
    selectSection,
    clearSelection,
    loopEntireTrack,
    combineSelected,
    splitAtTime,
    extendSelection,
    resetSelection,
  };
}
