import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import IconButton from '@mui/material/IconButton';
import type { Section } from '../utils/sectionDetector';
import type { LoopRegion } from '../hooks/useBeatSync';
import type { ChordEvent, KeyChange } from '../utils/chordAnalyzer';
import type { TempoRegion } from '../utils/tempoRegions';
import AppTooltip from '../../shared/components/AppTooltip';
import type { UserPracticeLane } from '../types/library';
import {
  formatTime,
  getShortSectionLabel,
  getSelectionLabel as computeSelectionLabel,
} from './playbackBar/playbackBarHelpers';
import SectionHoverCard from './playbackBar/SectionHoverCard';
import SectionControlsRow from './playbackBar/SectionControlsRow';
import LaneMenu from './playbackBar/LaneMenu';

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
  const getShortLabel = getShortSectionLabel;
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

  const selectionLabel = useMemo(
    () => computeSelectionLabel(activeSelectionIds, activeSections),
    [activeSelectionIds, activeSections],
  );

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
                        aria-label="Generated lane options"
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
                          aria-label={`Options for ${lane.name} lane`}
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

      <LaneMenu
        laneMenuId={laneMenuId}
        laneMenuAnchor={laneMenuAnchor}
        onClose={closeLaneMenu}
        onCloneGeneratedLane={onCloneGeneratedLane}
        onCloneLane={onCloneLane}
        onDeleteLane={onDeleteLane}
      />

      {hoveredSection && (
        <SectionHoverCard
          section={hoveredSection}
          locked={hoveredSectionLocked}
          draftLabel={hoverDraftLabel}
          onDraftLabelChange={setHoverDraftLabel}
          position={hoverPosition}
          chordChanges={chordChanges}
          keyChanges={keyChanges}
          tempoRegions={tempoRegions}
          onRenameSection={onRenameSection}
          onPointerEnter={() => {
            if (hoverClearTimeoutRef.current !== null) {
              window.clearTimeout(hoverClearTimeoutRef.current);
              hoverClearTimeoutRef.current = null;
            }
          }}
          onPointerLeave={scheduleHoverCardClose}
        />
      )}

      <SectionControlsRow
        currentTime={currentTime}
        hasSelection={hasSelection}
        selectionLabel={selectionLabel}
        activeSelectionCount={activeSelectionIds.length}
        selectedSectionCount={selectedSectionIds.length}
        referenceSelectedCount={referenceSelectedIds.length}
        snapToMeasuresEnabled={snapToMeasuresEnabled}
        nudgeUnit={nudgeUnit}
        onSplitAtCurrentTime={onSplitAtCurrentTime}
        onCombineSections={onCombineSections}
        onSaveReferenceSelection={onSaveReferenceSelection}
        onDeleteSelection={onDeleteSelection}
        onExtendSelection={onExtendSelection}
        onClearSelection={onClearSelection}
        onToggleSnapToMeasures={onToggleSnapToMeasures}
        onToggleNudgeUnit={onToggleNudgeUnit}
      />
    </div>
  );
};

export default PlaybackBar;
