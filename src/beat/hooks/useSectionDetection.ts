import { useState, useCallback } from 'react';
import {
  detectSections,
  mergeSections,
  splitSection,
  updateSectionBoundary,
  type Section,
  type SectionDetectionResult,
  type KeyChangeInfo,
} from '../utils/sectionDetector';
import type { ChordEvent } from '../utils/chordAnalyzer';

/** Options for section detection */
interface SectionDetectionOptions {
  minSectionDuration?: number;
  sensitivity?: number;
  musicStartTime?: number;
  bpm?: number;
  beatsPerMeasure?: number;
  /** Chord events for harmonic-aware section detection */
  chordEvents?: ChordEvent[];
  /** Chord change times for boundary snapping */
  chordChangeTimes?: number[];
  /** Key changes - these mark definite section boundaries */
  keyChanges?: KeyChangeInfo[];
}

interface UseSectionDetectionReturn {
  /** Detected sections */
  sections: Section[];
  /** Whether section detection is currently running */
  isDetecting: boolean;
  /** Detection confidence (0-1) */
  confidence: number;
  /** Warnings from detection */
  warnings: string[];
  /** Run section detection on an audio buffer */
  detectSectionsFromBuffer: (
    audioBuffer: AudioBuffer,
    beats?: number[],
    options?: SectionDetectionOptions
  ) => Promise<void>;
  /** Clear all sections */
  clearSections: () => void;
  /** Merge two adjacent sections */
  merge: (indexA: number, indexB: number) => void;
  /** Split a section at a specific time */
  split: (index: number, splitTime: number) => void;
  /** Update a section boundary */
  updateBoundary: (index: number, boundary: 'start' | 'end', newTime: number) => void;
  /** Update a section label */
  updateLabel: (index: number, newLabel: string) => void;
}

export function useSectionDetection(): UseSectionDetectionReturn {
  const [sections, setSections] = useState<Section[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);

  const detectSectionsFromBuffer = useCallback(
    async (
      audioBuffer: AudioBuffer,
      beats: number[] = [],
      options: SectionDetectionOptions = {}
    ) => {
      setIsDetecting(true);
      setWarnings([]);

      try {
        const result: SectionDetectionResult = await detectSections(audioBuffer, beats, options);
        setSections(result.sections);
        setConfidence(result.confidence);
        setWarnings(result.warnings);
      } catch (error) {
        console.error('[useSectionDetection] Section detection failed:', error);
        // Create a default "Full Track" section so the user can still use the app
        const musicStart = options.musicStartTime ?? 0;
        setSections([{
          id: 'section-0',
          startTime: musicStart,
          endTime: audioBuffer.duration,
          label: 'Full Track',
          color: '#9d8ec7',
          confidence: 0.5,
        }]);
        setConfidence(0.5);
        setWarnings(['Section detection failed - using full track as single section']);
      } finally {
        setIsDetecting(false);
      }
    },
    []
  );

  const clearSections = useCallback(() => {
    setSections([]);
    setConfidence(0);
    setWarnings([]);
  }, []);

  const merge = useCallback((indexA: number, indexB: number) => {
    setSections((current) => mergeSections(current, indexA, indexB));
  }, []);

  const split = useCallback((index: number, splitTime: number) => {
    setSections((current) => splitSection(current, index, splitTime));
  }, []);

  const updateBoundary = useCallback((index: number, boundary: 'start' | 'end', newTime: number) => {
    setSections((current) => updateSectionBoundary(current, index, boundary, newTime));
  }, []);

  const updateLabel = useCallback((index: number, newLabel: string) => {
    setSections((current) => {
      if (index < 0 || index >= current.length) return current;
      const updated = [...current];
      updated[index] = { ...updated[index], label: newLabel };
      return updated;
    });
  }, []);

  return {
    sections,
    isDetecting,
    confidence,
    warnings,
    detectSectionsFromBuffer,
    clearSections,
    merge,
    split,
    updateBoundary,
    updateLabel,
  };
}
