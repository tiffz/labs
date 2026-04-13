import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { Checkbox, FormControlLabel, IconButton, Menu, MenuItem, TextField } from '@mui/material';
import type { Section } from '../utils/sectionDetector';
import type { LoopRegion } from '../hooks/useBeatSync';
import type { ChordEvent, KeyChange } from '../utils/chordAnalyzer';
import type { TempoRegion } from '../utils/tempoRegions';
import AppTooltip from '../../shared/components/AppTooltip';
import type { UserPracticeLane } from '../types/library';

/** Playback position and timing state */
export interface PlaybackState {
  currentTime: number;
  duration: number;
  musicStartTime: number;
  /** When music actually ends (may be before track ends due to trailing silence) */
  musicEndTime?: number;
  syncStartTime: number;
  isInSyncRegion: boolean;
  /** Whether currently in a fermata/rubato region */
  isInFermata?: boolean;
  /** Tempo regions (fermatas, tempo changes, etc.) */
  tempoRegions?: TempoRegion[];
}

/** Loop region configuration */
export interface LoopState {
  region: LoopRegion | null;
  enabled: boolean;
}

/** Section selection and editing controls */
export interface SectionControls {
  sections: Section[];
  practiceLanes?: UserPracticeLane[];
  generatedLaneLabel?: string;
  referenceSections?: Section[];
  referenceSelectedIds?: string[];
  selectedIds: string[];
  isDetecting: boolean;
  onSelect?: (section: Section, extendSelection: boolean) => void;
  onSelectReference?: (section: Section, extendSelection: boolean) => void;
  onClear?: () => void;
  onCombine?: () => void;
  onSplit?: (sectionId: string, splitTime: number) => void;
  onExtend?: (direction: 'start' | 'end', delta: number) => void;
  /** Drag-resize a section boundary to a specific time */
  onResizeSection?: (sectionId: string, edge: 'start' | 'end', newTime: number) => void;
  onSaveReferenceSelection?: () => void;
  onSplitAtCurrentTime?: () => void;
  onDeleteSelection?: () => void;
  snapToMeasuresEnabled?: boolean;
  onToggleSnapToMeasures?: (enabled: boolean) => void;
  nudgeUnit?: 'measure' | 'beat';
  onToggleNudgeUnit?: (unit: 'measure' | 'beat') => void;
  onCreateLane?: () => void;
  onRenameLane?: (laneId: string, name: string) => void;
  onDeleteLane?: (laneId: string) => void;
  onCloneGeneratedLane?: () => void;
  onCloneLane?: (laneId: string) => void;
  onRenameSection?: (sectionId: string, label: string) => void;
}

/** Chord/key data for section hover display */
export interface ChordDisplayData {
  chordChanges: ChordEvent[];
  keyChanges: KeyChange[];
}

interface PlaybackBarProps {
  /** Playback position state */
  playback: PlaybackState;
  /** Loop region state */
  loop: LoopState;
  /** Section selection controls */
  sectionControls: SectionControls;
  /** Chord data for hover display (optional) */
  chordData?: ChordDisplayData;
  /** Seek to a specific time */
  onSeek: (time: number) => void;
  /** Change the sync start time */
  onSyncStartChange: (time: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const PlaybackBar: React.FC<PlaybackBarProps> = ({
  playback,
  loop,
  sectionControls,
  chordData,
  onSeek,
  onSyncStartChange,
}) => {
  // Destructure grouped props for easier access
  const { currentTime, duration, musicStartTime, musicEndTime, syncStartTime, isInSyncRegion, tempoRegions } = playback;
  // isInFermata is available in playback but not currently used for UI indication
  const { region: loopRegion, enabled: loopEnabled } = loop;
  const {
    sections,
    practiceLanes = [],
    generatedLaneLabel = 'Generated Sections',
    referenceSections = [],
    referenceSelectedIds = [],
    selectedIds: selectedSectionIds,
    isDetecting: isDetectingSections,
    onSelect: onSelectSection,
    onSelectReference,
    onClear: onClearSelection,
    onCombine: onCombineSections,
    onExtend: onExtendSelection,
    onSaveReferenceSelection,
    onSplitAtCurrentTime,
    onDeleteSelection,
    snapToMeasuresEnabled = true,
    onToggleSnapToMeasures,
    onCreateLane,
    onRenameLane,
    onDeleteLane,
    onCloneGeneratedLane,
    onCloneLane,
    onRenameSection,
    onResizeSection,
    nudgeUnit = 'measure',
    onToggleNudgeUnit,
  } = sectionControls;
  const chordChanges = useMemo(() => chordData?.chordChanges ?? [], [chordData]);
  const keyChanges = useMemo(() => chordData?.keyChanges ?? [], [chordData]);
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<boolean>(false);
  const dragRef = useRef<{ sectionId: string; edge: 'start' | 'end'; trackEl: HTMLElement } | null>(null);

  // Check if "Loop track" mode is active (loop enabled but no section selected)
  // Defined early because handleClick needs it
  const isLoopTrackMode = loopEnabled && selectedSectionIds.length === 0;

  const getTimeFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!barRef.current || duration === 0) return 0;
      const rect = barRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      return percentage * duration;
    },
    [duration]
  );

  const handleEdgeDragStart = useCallback(
    (e: React.MouseEvent, sectionId: string, edge: 'start' | 'end') => {
      e.stopPropagation();
      e.preventDefault();
      const trackEl = (e.target as HTMLElement).closest('.section-labels-row') as HTMLElement | null;
      if (!trackEl || !onResizeSection) return;
      dragRef.current = { sectionId, edge, trackEl };

      const onMove = (me: MouseEvent) => {
        if (!dragRef.current) return;
        const rect = dragRef.current.trackEl.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width));
        const newTime = pct * duration;
        onResizeSection(dragRef.current.sectionId, dragRef.current.edge, newTime);
      };
      const onUp = () => {
        dragRef.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [duration, onResizeSection]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragging) return;
      const newTime = getTimeFromEvent(e);
      const clampedTime = Math.max(0, Math.min(duration, newTime));
      onSeek(clampedTime);
      
      // Auto-select the section at this timestamp (extend when shift is held)
      // Skip if section is already selected (unless shift is held for range selection)
      // Also skip auto-selection in "Loop Track" mode to avoid unexpectedly changing loop mode
      if (sections.length > 0 && onSelectSection && !isLoopTrackMode) {
        const sectionAtTime = sections.find(
          (s) => clampedTime >= s.startTime && clampedTime < s.endTime
        );
        if (sectionAtTime && (!selectedSectionIds.includes(sectionAtTime.id) || e.shiftKey)) {
          onSelectSection(sectionAtTime, e.shiftKey);
        }
      }
    },
    [duration, onSeek, getTimeFromEvent, dragging, sections, onSelectSection, selectedSectionIds, isLoopTrackMode]
  );

  const handleBarDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragging) return;
      if (e.buttons !== 1 || !barRef.current || duration === 0) return;
      handleClick(e);
    },
    [duration, handleClick, dragging]
  );

  const handleBarKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (duration > 0) onSeek(currentTime);
      }
    },
    [currentTime, duration, onSeek]
  );

  // Handle sync handle drag
  const handleSyncDragStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleSyncDragMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return;
      const time = getTimeFromEvent(e);
      onSyncStartChange(Math.max(0, Math.min(time, duration - 1)));
    },
    [dragging, getTimeFromEvent, onSyncStartChange, duration]
  );

  const handleSyncDragEnd = useCallback(() => {
    setDragging(false);
  }, []);

  // Document-level listeners for dragging
  React.useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleSyncDragMove);
      document.addEventListener('mouseup', handleSyncDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleSyncDragMove);
        document.removeEventListener('mouseup', handleSyncDragEnd);
      };
    }
  }, [dragging, handleSyncDragMove, handleSyncDragEnd]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const syncStartPercent = duration > 0 ? (syncStartTime / duration) * 100 : 0;

  // Show sync start handle when there's any intro or if user might need to adjust sync
  // Lower threshold to make it more discoverable for songs with delayed beat entry
  const showSyncStartHandle = syncStartTime > 0.1 || musicStartTime > 0.1;
  
  // Show music end marker if music ends significantly before track ends (more than 2 seconds of trailing silence)
  const effectiveMusicEndTime = musicEndTime ?? duration;
  const showMusicEndMarker = effectiveMusicEndTime < duration - 2;
  const musicEndPercent = duration > 0 ? (effectiveMusicEndTime / duration) * 100 : 100;

  // Calculate loop region position
  const loopStartPercent = loopRegion && duration > 0 ? (loopRegion.startTime / duration) * 100 : 0;
  const loopEndPercent = loopRegion && duration > 0 ? (loopRegion.endTime / duration) * 100 : 0;
  const loopWidthPercent = loopEndPercent - loopStartPercent;

  // Find which section is currently playing
  const currentSection = sections.find(
    (s) => currentTime >= s.startTime && currentTime < s.endTime
  );
  const currentSectionId = currentSection?.id;
  
  // Handle section click - toggle if already selected
  const handleSectionClick = useCallback(
    (e: React.MouseEvent, section: Section) => {
      e.stopPropagation();
      const isSelected = selectedSectionIds.includes(section.id);
      
      if (isSelected && !e.shiftKey) {
        // Clicking a selected section deselects it (unless shift is held for range selection)
        onClearSelection?.();
      } else if (isLoopTrackMode) {
        // In "Loop track" mode, clicking a section just seeks to it without changing loop mode
        onSeek(section.startTime);
      } else if (onSelectSection) {
        onSelectSection(section, e.shiftKey);
      }
    },
    [onSelectSection, onClearSelection, selectedSectionIds, isLoopTrackMode, onSeek]
  );

  const handleReferenceSectionClick = useCallback(
    (e: React.MouseEvent, section: Section) => {
      e.stopPropagation();
      if (onSelectReference) {
        onSelectReference(section, e.shiftKey);
      } else if (onSelectSection) {
        onSelectSection(section, e.shiftKey);
      }
    },
    [onSelectReference, onSelectSection]
  );

  const hasSelection = selectedSectionIds.length > 0 || referenceSelectedIds.length > 0;
  const activeSelectionIds = selectedSectionIds.length > 0 ? selectedSectionIds : referenceSelectedIds;
  const activeSections = selectedSectionIds.length > 0 ? sections : referenceSections;

  // Extract just the first measure number for compact labels
  const getShortLabel = (label: string) => {
    // "M48-59" -> "M48", "M1-8" -> "M1"
    const match = label.match(/^(M\d+)/);
    return match ? match[1] : label;
  };

  // Get the measure range for selected sections
  const getSelectionLabel = () => {
    if (activeSelectionIds.length === 0) return '';
    
    // Get selected sections in order
    const selectedSections = activeSections
      .filter(s => activeSelectionIds.includes(s.id))
      .sort((a, b) => a.startTime - b.startTime);
    
    if (selectedSections.length === 0) return '';
    
    // Extract first measure from first section
    const firstMatch = selectedSections[0].label.match(/M(\d+)/);
    const firstMeasure = firstMatch ? firstMatch[1] : '?';
    
    // Extract last measure from last section (second number in "M48-59" format)
    const lastSection = selectedSections[selectedSections.length - 1];
    const lastMatch = lastSection.label.match(/M\d+-(\d+)/);
    const lastMeasure = lastMatch ? lastMatch[1] : firstMeasure;

    // Duration of selection
    const selectionStart = selectedSections[0].startTime;
    const selectionEnd = selectedSections[selectedSections.length - 1].endTime;
    const selectionSeconds = Math.max(0, selectionEnd - selectionStart);
    
    if (firstMeasure === lastMeasure) {
      return `M${firstMeasure} · ${selectionSeconds.toFixed(1)}s`;
    }
    return `M${firstMeasure}–${lastMeasure} · ${selectionSeconds.toFixed(1)}s`;
  };

  // Get chords within a section (simplified - only unique chords)
  const getChordsForSection = useMemo(() => {
    return (section: Section): string[] => {
      if (chordChanges.length === 0) return [];
      
      const sectionChords = chordChanges.filter(
        c => c.time >= section.startTime && c.time < section.endTime && c.chord !== 'N'
      );
      
      // Get unique chords in order they appear, limiting to most prominent
      const seen = new Set<string>();
      const uniqueChords: string[] = [];
      for (const c of sectionChords) {
        if (!seen.has(c.chord)) {
          seen.add(c.chord);
          uniqueChords.push(c.chord);
        }
      }
      
      return uniqueChords.slice(0, 6); // Limit to 6 chords for display
    };
  }, [chordChanges]);

  // Get key change within a section (if any)
  const getKeyChangeForSection = useMemo(() => {
    return (section: Section): KeyChange | null => {
      if (keyChanges.length === 0) return null;

      // Find key change that starts within this section
      // Be lenient: if a key change is within 2 seconds of section start, consider it part of this section
      // This handles cases where key change and section boundary were snapped to slightly different times
      return keyChanges.find(
        k => k.time >= section.startTime - 2 && k.time < section.endTime
      ) ?? null;
    };
  }, [keyChanges]);

  // Get tempo info for a section
  const getTempoInfoForSection = useMemo(() => {
    return (section: Section): { bpm: number | null; hasFermata: boolean; description: string | null } => {
      if (!tempoRegions || tempoRegions.length === 0) {
        return { bpm: null, hasFermata: false, description: null };
      }

      // Find tempo regions that overlap with this section
      const overlappingRegions = tempoRegions.filter(
        r => r.startTime < section.endTime && r.endTime > section.startTime
      );

      if (overlappingRegions.length === 0) {
        return { bpm: null, hasFermata: false, description: null };
      }

      // Check for fermatas
      const hasFermata = overlappingRegions.some(r => r.type === 'fermata');

      // Find the primary BPM (from steady regions)
      const steadyRegions = overlappingRegions.filter(r => r.type === 'steady' && r.bpm !== null);
      const primaryBpm = steadyRegions.length > 0 ? steadyRegions[0].bpm : null;

      // Build description with specific details for each tempo event
      let description: string | null = null;
      const tempoTypes = overlappingRegions.filter(r => r.type !== 'steady');
      if (tempoTypes.length > 0) {
        const typeDescriptions = tempoTypes.map(r => {
          // Use the region's own description if available (includes timestamps)
          if (r.description) return r.description;
          
          // Fallback: generate description with timestamp
          const timeStr = formatTime(r.startTime);
          const durationStr = `${(r.endTime - r.startTime).toFixed(1)}s`;
          if (r.type === 'fermata') return `Fermata at ${timeStr} (${durationStr})`;
          if (r.type === 'rubato') return `Free tempo at ${timeStr}`;
          if (r.type === 'accelerando') return `Speeds up at ${timeStr}`;
          if (r.type === 'ritardando') return `Slows down at ${timeStr}`;
          return r.type;
        });
        description = typeDescriptions.join(' · ');
      }

      // Check for tempo change within section
      const uniqueBpms = [...new Set(steadyRegions.map(r => r.bpm))];
      if (uniqueBpms.length > 1) {
        description = description 
          ? `${description} · tempo changes`
          : `tempo changes (${uniqueBpms.join(' → ')} BPM)`;
      }

      return { bpm: primaryBpm, hasFermata, description };
    };
  }, [tempoRegions]);

  // Hovered section for tooltip
  const [hoveredSection, setHoveredSection] = useState<Section | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const hoverAnchorRef = useRef<HTMLElement | null>(null);
  const hoverClearTimeoutRef = useRef<number | null>(null);
  const [expandPracticeTracks, setExpandPracticeTracks] = useState(false);
  const [laneMenuId, setLaneMenuId] = useState<string | null>(null);
  const [laneMenuAnchor, setLaneMenuAnchor] = useState<HTMLElement | null>(null);
  const [hoverDraftLabel, setHoverDraftLabel] = useState('');
  const [hoveredSectionLocked, setHoveredSectionLocked] = useState(false);
  const collapsedPracticeTracks = practiceLanes.length > 3 && !expandPracticeTracks;
  const visiblePracticeLanes = collapsedPracticeTracks ? practiceLanes.slice(0, 3) : practiceLanes;
  const hasTimelineLanes = referenceSections.length > 0 || visiblePracticeLanes.length > 0;

  const handleSectionHover = useCallback((section: Section | null, e?: React.MouseEvent, locked = false) => {
    if (hoverClearTimeoutRef.current !== null) {
      window.clearTimeout(hoverClearTimeoutRef.current);
      hoverClearTimeoutRef.current = null;
    }
    setHoveredSection(section);
    setHoveredSectionLocked(Boolean(section) && locked);
    setHoverDraftLabel(section?.label ?? '');
    if (section && e) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setHoverPosition({ x: rect.left + rect.width / 2, y: rect.bottom });
      hoverAnchorRef.current = e.currentTarget as HTMLElement;
    } else {
      hoverAnchorRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!hoveredSection || !hoverAnchorRef.current) return;
    const updateHoverPosition = () => {
      if (!hoverAnchorRef.current) return;
      const rect = hoverAnchorRef.current.getBoundingClientRect();
      setHoverPosition({ x: rect.left + rect.width / 2, y: rect.bottom });
    };
    updateHoverPosition();
    window.addEventListener('scroll', updateHoverPosition, true);
    window.addEventListener('resize', updateHoverPosition);
    return () => {
      window.removeEventListener('scroll', updateHoverPosition, true);
      window.removeEventListener('resize', updateHoverPosition);
    };
  }, [hoveredSection]);

  const openLaneMenu = (laneId: string, anchor: HTMLElement) => {
    setLaneMenuId(laneId);
    setLaneMenuAnchor(anchor);
  };

  const closeLaneMenu = () => {
    setLaneMenuId(null);
    setLaneMenuAnchor(null);
  };

  const scheduleHoverCardClose = () => {
    if (hoverClearTimeoutRef.current !== null) {
      window.clearTimeout(hoverClearTimeoutRef.current);
    }
    hoverClearTimeoutRef.current = window.setTimeout(() => {
      setHoveredSection(null);
      hoverAnchorRef.current = null;
    }, 140);
  };
  
  return (
    <div className="playback-bar-wrapper">
      {/* Detecting indicator */}
      {isDetectingSections && (
        <div className="section-detecting">
          <div className="analyzing-spinner small" />
          <span>Detecting sections...</span>
        </div>
      )}

      {/* Main playback bar with integrated sections */}
      <div className={`playback-bar-container ${hasTimelineLanes ? 'has-lanes' : ''}`}>
        <div className={`playback-bar-sections ${hasTimelineLanes ? 'has-lanes' : ''}`}>
          <div className={`playback-ruler-row ${hasTimelineLanes ? 'has-lanes' : ''}`}>
            {hasTimelineLanes && (
              <div className="playback-ruler-spacer">
                <span className="playback-ruler-time-readout">{`${formatTime(currentTime)} / ${formatTime(duration)}`}</span>
              </div>
            )}
            <div className="playback-ruler-track-wrap">
              <div
                ref={barRef}
                className={`playback-bar ${dragging ? 'dragging' : ''}`}
                onClick={handleClick}
                onMouseMove={handleBarDrag}
                role="slider"
                aria-label="Playback position"
                aria-valuenow={currentTime}
                aria-valuemin={0}
                aria-valuemax={duration}
                tabIndex={0}
                onKeyDown={handleBarKeyDown}
              >
            {/* Track background */}
                <div className="playback-track">
              {/* Selected section highlight */}
              {sections.length > 0 && (
                <div className="section-markers">
                  {sections.map((section) => {
                    const startPercent = (section.startTime / duration) * 100;
                    const widthPercent = ((section.endTime - section.startTime) / duration) * 100;
                    const isSelected = selectedSectionIds.includes(section.id);
                    // Only render markers for selected sections
                    if (!isSelected) return null;
                    return (
                      <div
                        key={section.id}
                        className="section-marker selected"
                        style={{
                          left: `${startPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {referenceSections.length > 0 && (
                <div className="section-markers reference">
                  {referenceSections.map((section) => {
                    if (!referenceSelectedIds.includes(section.id)) return null;
                    const startPercent = (section.startTime / duration) * 100;
                    const widthPercent = ((section.endTime - section.startTime) / duration) * 100;
                    return (
                      <div
                        key={`reference-selected-${section.id}`}
                        className="section-marker selected reference"
                        style={{
                          left: `${startPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* Dimmed region before sync start */}
              {syncStartPercent > 0 && (
                <div
                  className="pre-sync-region"
                  style={{ left: '0%', width: `${syncStartPercent}%` }}
                />
              )}

              {/* Selection region overlay (always visible when selected) */}
              {hasSelection && loopRegion && (
                <div
                  className={`selection-region-overlay ${loopEnabled ? 'looping' : ''}`}
                  style={{
                    left: `${loopStartPercent}%`,
                    width: `${loopWidthPercent}%`,
                  }}
                />
              )}

              {/* Loop region overlay */}
              {loopRegion && loopEnabled && (
                <div
                  className="loop-region-overlay"
                  style={{
                    left: `${loopStartPercent}%`,
                    width: `${loopWidthPercent}%`,
                  }}
                />
              )}

              {/* Progress fill */}
              <div
                className={`playback-progress ${isInSyncRegion ? '' : 'dimmed'}`}
                style={{ width: `${progressPercent}%` }}
              />

              {/* Section divider lines - rendered on top of progress */}
              {/* Removed dense section divider lines for clarity with multi-track editing */}

              {/* Sync start handle - simple draggable line */}
              {showSyncStartHandle && (
                <button
                  className={`sync-handle ${dragging ? 'dragging' : ''}`}
                  style={{ left: `${syncStartPercent}%` }}
                  onMouseDown={handleSyncDragStart}
                  title={`Beat sync starts at ${formatTime(syncStartTime)} — drag to adjust where beat 1 begins (useful if song has an intro or pickup notes)`}
                  type="button"
                  aria-label="Drag beat sync start marker"
                />
              )}

              {/* Music end marker - shows where music ends (before any trailing silence) */}
              {showMusicEndMarker && (
                <div
                  className="music-end-marker"
                  style={{ left: `${musicEndPercent}%` }}
                  title={`Music ends at ${formatTime(effectiveMusicEndTime)} (track continues to ${formatTime(duration)})`}
                />
              )}

              {/* Playhead */}
              <div
                className="playhead"
                style={{ left: `${progressPercent}%` }}
              />
                </div>
              </div>
            </div>
          </div>

          {/* Section lanes - generated + editable practice lanes */}
          <div className="lane-stack">
            {hasTimelineLanes && (
              <div className="lane-playhead-track-overlay">
                <div className="lane-playhead-line" style={{ left: `${progressPercent}%` }}>
                  <span className="lane-playhead-cap" />
                </div>
              </div>
            )}
            {referenceSections.length > 0 && (
              <div className="lane-row">
                <div className="lane-label-cell generated">
                  <div className="lane-label-top">
                    <span className="lane-label-text">{generatedLaneLabel}</span>
                    <AppTooltip title="Auto-generated section guesses from analysis. Accuracy varies, and this lane is read-only. Use clone to create an editable lane.">
                      <span className="material-symbols-outlined lane-info-icon">info</span>
                    </AppTooltip>
                    <div className="lane-menu-shell">
                      <IconButton
                        size="small"
                        className="lane-menu-trigger"
                        onClick={(event) => openLaneMenu('generated', event.currentTarget)}
                      >
                        <span className="material-symbols-outlined">more_horiz</span>
                      </IconButton>
                    </div>
                  </div>
                </div>
                <div className="lane-track-cell section-labels-row section-labels-reference">
                  {referenceSections.map((section) => {
                    const startPercent = (section.startTime / duration) * 100;
                    const widthPercent = ((section.endTime - section.startTime) / duration) * 100;
                    const isSelected = referenceSelectedIds.includes(section.id);
                    return (
                      <button
                        key={`reference-${section.id}`}
                        className={`section-label-btn reference ${isSelected ? 'selected' : ''}`}
                        style={{
                          left: `${startPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                        onClick={(e) => handleReferenceSectionClick(e, section)}
                        onMouseEnter={(e) => handleSectionHover(section, e, true)}
                        onMouseLeave={scheduleHoverCardClose}
                      >
                        <span className="section-label-text">{getShortLabel(section.label)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {visiblePracticeLanes.map((lane) => {
              const laneSections = sections.filter((section) => (section as Section & { laneId?: string }).laneId === lane.id);
              return (
                <div key={lane.id} className="lane-row">
                  <div className="lane-label-cell">
                    <div className="lane-label-top">
                      <input
                        className="lane-name-input"
                        defaultValue={lane.name}
                        onBlur={(event) => onRenameLane?.(lane.id, event.target.value)}
                      />
                      <div className="lane-menu-shell">
                        <IconButton
                          size="small"
                          className="lane-menu-trigger"
                          onClick={(event) => openLaneMenu(lane.id, event.currentTarget)}
                        >
                          <span className="material-symbols-outlined">more_horiz</span>
                        </IconButton>
                      </div>
                    </div>
                  </div>
                  <div className="lane-track-cell section-labels-row">
                    {laneSections.map((section) => {
                      const startPercent = (section.startTime / duration) * 100;
                      const widthPercent = ((section.endTime - section.startTime) / duration) * 100;
                      const isSelected = selectedSectionIds.includes(section.id);
                      const isPlaying = section.id === currentSectionId;
                      return (
                        <button
                          key={section.id}
                          className={`section-label-btn ${isSelected ? 'selected' : ''} ${isPlaying ? 'playing' : ''}`}
                          style={{
                            left: `${startPercent}%`,
                            width: `${widthPercent}%`,
                          }}
                          onClick={(e) => handleSectionClick(e, section)}
                          onMouseEnter={(e) => handleSectionHover(section, e, false)}
                          onMouseLeave={scheduleHoverCardClose}
                        >
                          {onResizeSection && (
                            // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- drag handle inside button
                            <span
                              className="section-drag-handle left"
                              onMouseDown={(e) => handleEdgeDragStart(e, section.id, 'start')}
                            />
                          )}
                          <span className="section-label-text">{getShortLabel(section.label)}</span>
                          {onResizeSection && (
                            // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- drag handle inside button
                            <span
                              className="section-drag-handle right"
                              onMouseDown={(e) => handleEdgeDragStart(e, section.id, 'end')}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {onCreateLane && (
              <div className="lane-row lane-row-create">
                <div className="lane-label-cell lane-label-cell-create">
                  <button type="button" className="lane-create-btn" onClick={onCreateLane}>
                    <span className="material-symbols-outlined">add</span>
                    New lane
                  </button>
                </div>
                <div className="lane-track-cell section-labels-row lane-track-create" />
              </div>
            )}
          </div>
          {practiceLanes.length > 3 && (
            <button
              type="button"
              className="practice-track-toggle"
              onClick={() => setExpandPracticeTracks((value) => !value)}
            >
              {expandPracticeTracks ? 'Collapse lanes' : `Show all lanes (${practiceLanes.length})`}
            </button>
          )}
        </div>
      </div>

      <Menu
        anchorEl={laneMenuAnchor}
        open={Boolean(laneMenuAnchor && laneMenuId)}
        onClose={closeLaneMenu}
        PaperProps={{ className: 'lane-menu-paper' }}
      >
        {(laneMenuId === 'generated' ? !!onCloneGeneratedLane : !!onCloneLane) && (
          <MenuItem
            className="lane-menu-item"
            onClick={() => {
              if (laneMenuId === 'generated') {
                onCloneGeneratedLane?.();
              } else if (laneMenuId) {
                onCloneLane?.(laneMenuId);
              }
              closeLaneMenu();
            }}
          >
            <span className="material-symbols-outlined">content_copy</span>
            Clone lane
          </MenuItem>
        )}
        {laneMenuId && laneMenuId !== 'generated' && onDeleteLane && (
          <MenuItem
            className="lane-menu-item danger"
            onClick={() => {
              onDeleteLane(laneMenuId);
              closeLaneMenu();
            }}
          >
            <span className="material-symbols-outlined">delete</span>
            Delete lane
          </MenuItem>
        )}
      </Menu>

      {/* Section hover card */}
      {hoveredSection && (
        <div
          className="section-hover-card"
          style={{ 
            left: `${Math.min(Math.max(hoverPosition.x, 190), window.innerWidth - 190)}px`,
            top: `${hoverPosition.y + 10}px`,
          }}
          onPointerEnter={() => {
            if (hoverClearTimeoutRef.current !== null) {
              window.clearTimeout(hoverClearTimeoutRef.current);
              hoverClearTimeoutRef.current = null;
            }
          }}
          onPointerLeave={scheduleHoverCardClose}
        >
          {!hoveredSectionLocked && onRenameSection ? (
            <TextField
              value={hoverDraftLabel}
              size="small"
              className="section-hover-name-input"
              onChange={(event) => setHoverDraftLabel(event.target.value)}
              onBlur={() => {
                const trimmed = hoverDraftLabel.trim();
                if (trimmed.length > 0 && trimmed !== hoveredSection.label) {
                  onRenameSection(hoveredSection.id, trimmed);
                } else {
                  setHoverDraftLabel(hoveredSection.label);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  const trimmed = hoverDraftLabel.trim();
                  if (trimmed.length > 0 && trimmed !== hoveredSection.label) {
                    onRenameSection(hoveredSection.id, trimmed);
                  }
                }
                if (event.key === 'Escape') {
                  setHoverDraftLabel(hoveredSection.label);
                }
              }}
            />
          ) : (
            <div className="section-hover-title">{hoveredSection.label}</div>
          )}
          <div className="section-hover-times">
            <span>{formatTime(hoveredSection.startTime)}</span>
            <span className="section-hover-arrow">→</span>
            <span>{formatTime(hoveredSection.endTime)}</span>
          </div>
          <div className="section-hover-duration">
            Duration: {Math.round(hoveredSection.endTime - hoveredSection.startTime)}s
          </div>
          
          {/* Analysis details only for generated/locked sections */}
          {hoveredSectionLocked && getChordsForSection(hoveredSection).length > 0 && (
            <div className="section-hover-chords">
              <span className="section-hover-label">Chords (estimated):</span>
              <span className="section-chord-list">
                {getChordsForSection(hoveredSection).join(' → ')}
              </span>
            </div>
          )}
          
          {/* Key change in this section */}
          {hoveredSectionLocked && (() => {
            const keyChange = getKeyChangeForSection(hoveredSection);
            if (keyChange) {
              return (
                <div className="section-hover-key-change">
                  <span className="material-symbols-outlined key-change-icon">change_circle</span>
                  <span>Detected key change to <strong>{keyChange.key} {keyChange.scale}</strong></span>
                </div>
              );
            }
            return null;
          })()}

          {/* Tempo info for this section */}
          {hoveredSectionLocked && (() => {
            const tempoInfo = getTempoInfoForSection(hoveredSection);
            if (tempoInfo.bpm || tempoInfo.description) {
              return (
                <div className="section-hover-tempo">
                  <span className="material-symbols-outlined tempo-icon">timer</span>
                  <span>
                    {tempoInfo.bpm && <strong>{tempoInfo.bpm} BPM</strong>}
                    {tempoInfo.bpm && tempoInfo.description && ' · '}
                    {tempoInfo.description && <em>{tempoInfo.description}</em>}
                  </span>
                </div>
              );
            }
            return null;
          })()}

          <div className="section-hover-hint">
            Click to select · Shift+click to extend
          </div>
        </div>
      )}

      {/* Section editing controls - row always rendered to prevent layout shift */}
      <div className="section-controls-row">
        <div className="section-actions">
          {onSplitAtCurrentTime && (
            <AppTooltip title={hasSelection ? `Split at current timestamp (${currentTime.toFixed(1)}s)` : `Split song at current timestamp (${currentTime.toFixed(1)}s)`}>
              <button className="section-action-btn icon-only" onClick={onSplitAtCurrentTime}>
                <span className="material-symbols-outlined">content_cut</span>
              </button>
            </AppTooltip>
          )}
          {hasSelection && (
            <>
              <span className="section-actions-label">
                {getSelectionLabel()}:
              </span>
              {activeSelectionIds.length >= 2 && onCombineSections && (
                <AppTooltip title="Combine selected sections">
                  <button className="section-action-btn icon-only" onClick={onCombineSections}>
                    <span className="material-symbols-outlined">merge</span>
                  </button>
                </AppTooltip>
              )}
              {onSaveReferenceSelection && referenceSelectedIds.length > 0 && (
                <AppTooltip title="Save selected analysis range as practice section">
                  <button className="section-action-btn icon-only" onClick={onSaveReferenceSelection}>
                    <span className="material-symbols-outlined">save</span>
                  </button>
                </AppTooltip>
              )}
              {onDeleteSelection && selectedSectionIds.length > 0 && (
                <AppTooltip title="Delete selected practice sections">
                  <button className="section-action-btn icon-only danger" onClick={onDeleteSelection}>
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </AppTooltip>
              )}
              {onExtendSelection && (
                <div className="section-nudge-controls">
                  <span className="nudge-label">Nudge:</span>
                  {onToggleNudgeUnit && (
                    <div className="nudge-unit-toggle">
                      <button
                        className={`nudge-unit-btn${nudgeUnit === 'beat' ? ' active' : ''}`}
                        onClick={() => onToggleNudgeUnit('beat')}
                        type="button"
                      >Beat</button>
                      <button
                        className={`nudge-unit-btn${nudgeUnit === 'measure' ? ' active' : ''}`}
                        onClick={() => onToggleNudgeUnit('measure')}
                        type="button"
                      >Measure</button>
                    </div>
                  )}
                  <AppTooltip title={`Extend start 1 ${nudgeUnit} earlier`}>
                    <button 
                      className="nudge-btn has-tooltip"
                      onClick={() => onExtendSelection('start', -1)}
                    >
                      <span className="material-symbols-outlined">first_page</span>
                    </button>
                  </AppTooltip>
                  <AppTooltip title={`Shrink start 1 ${nudgeUnit} later`}>
                    <button 
                      className="nudge-btn has-tooltip"
                      onClick={() => onExtendSelection('start', 1)}
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </AppTooltip>
                  <span className="nudge-divider">|</span>
                  <AppTooltip title={`Shrink end 1 ${nudgeUnit} earlier`}>
                    <button 
                      className="nudge-btn has-tooltip"
                      onClick={() => onExtendSelection('end', -1)}
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                  </AppTooltip>
                  <AppTooltip title={`Extend end 1 ${nudgeUnit} later`}>
                    <button 
                      className="nudge-btn has-tooltip"
                      onClick={() => onExtendSelection('end', 1)}
                    >
                      <span className="material-symbols-outlined">last_page</span>
                    </button>
                  </AppTooltip>
                </div>
              )}
              {onToggleSnapToMeasures && (
                <FormControlLabel
                  className="section-checkbox-row inline compact mui"
                  control={
                    <Checkbox
                      size="small"
                      checked={snapToMeasuresEnabled}
                      onChange={(event) => onToggleSnapToMeasures(event.target.checked)}
                    />
                  }
                  label={<span className="section-checkbox-label">Snap to measures</span>}
                />
              )}
              <AppTooltip title="Deselect all sections">
                <button className="section-action-btn deselect icon-only" onClick={onClearSelection}>
                  <span className="material-symbols-outlined">deselect</span>
                </button>
              </AppTooltip>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaybackBar;
