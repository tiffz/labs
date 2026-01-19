import React, { useCallback, useRef, useState, useMemo } from 'react';
import type { Section } from '../utils/sectionDetector';
import type { LoopRegion } from '../hooks/useBeatSync';
import type { ChordEvent, KeyChange } from '../utils/chordAnalyzer';
import type { TempoRegion } from '../utils/tempoRegions';

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
  selectedIds: string[];
  isDetecting: boolean;
  onSelect?: (section: Section, extendSelection: boolean) => void;
  onClear?: () => void;
  onCombine?: () => void;
  onSplit?: (sectionId: string, splitTime: number) => void;
  onExtend?: (direction: 'start' | 'end', delta: number) => void;
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
    selectedIds: selectedSectionIds,
    isDetecting: isDetectingSections,
    onSelect: onSelectSection,
    onClear: onClearSelection,
    onCombine: onCombineSections,
    onSplit: onSplitSection,
    onExtend: onExtendSelection,
  } = sectionControls;
  const chordChanges = useMemo(() => chordData?.chordChanges ?? [], [chordData]);
  const keyChanges = useMemo(() => chordData?.keyChanges ?? [], [chordData]);
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<boolean>(false);

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

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragging) return;
      const newTime = getTimeFromEvent(e);
      const clampedTime = Math.max(0, Math.min(duration, newTime));
      onSeek(clampedTime);
      
      // Auto-select the section at this timestamp (extend when shift is held)
      // Skip if section is already selected (unless shift is held for range selection)
      if (sections.length > 0 && onSelectSection) {
        const sectionAtTime = sections.find(
          (s) => clampedTime >= s.startTime && clampedTime < s.endTime
        );
        if (sectionAtTime && (!selectedSectionIds.includes(sectionAtTime.id) || e.shiftKey)) {
          onSelectSection(sectionAtTime, e.shiftKey);
        }
      }
    },
    [duration, onSeek, getTimeFromEvent, dragging, sections, onSelectSection, selectedSectionIds]
  );

  const handleBarDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragging) return;
      if (e.buttons !== 1 || !barRef.current || duration === 0) return;
      handleClick(e);
    },
    [duration, handleClick, dragging]
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

  // Only show sync start handle if there's an intro to skip
  const showSyncStartHandle = syncStartTime > 0.5 || musicStartTime > 0.5;
  
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

  // Check if "Loop track" mode is active (loop enabled but no section selected)
  const isLoopTrackMode = loopEnabled && selectedSectionIds.length === 0;
  
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

  const hasSelection = selectedSectionIds.length > 0;

  // Extract just the first measure number for compact labels
  const getShortLabel = (label: string) => {
    // "M48-59" -> "M48", "M1-8" -> "M1"
    const match = label.match(/^(M\d+)/);
    return match ? match[1] : label;
  };

  // Get the measure range for selected sections
  const getSelectionLabel = () => {
    if (selectedSectionIds.length === 0) return '';
    
    // Get selected sections in order
    const selectedSections = sections
      .filter(s => selectedSectionIds.includes(s.id))
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

  const handleSectionHover = useCallback((section: Section | null, e?: React.MouseEvent) => {
    setHoveredSection(section);
    if (section && e) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setHoverPosition({ x: rect.left + rect.width / 2, y: rect.top });
    }
  }, []);
  
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
      <div className="playback-bar-container">
        <span className="time-display current">{formatTime(currentTime)}</span>

        <div className="playback-bar-sections">
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

              {/* Dimmed region before sync start (rubato intro) */}
              {syncStartPercent > 0 && (
                <div
                  className="pre-sync-region"
                  style={{ left: '0%', width: `${syncStartPercent}%` }}
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

              {/* Tempo region markers (fermatas, rubato, tempo changes) */}
              {tempoRegions && tempoRegions.length > 0 && (
                <div className="tempo-region-markers">
                  {tempoRegions.map((region) => {
                    // Only render non-steady regions
                    if (region.type === 'steady') return null;
                    const startPercent = (region.startTime / duration) * 100;
                    const widthPercent = ((region.endTime - region.startTime) / duration) * 100;
                    return (
                      <div
                        key={region.id}
                        className={`tempo-region-marker tempo-${region.type}`}
                        style={{
                          left: `${startPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                        title={region.description || `${region.type}`}
                      />
                    );
                  })}
                </div>
              )}

              {/* Progress fill */}
              <div
                className={`playback-progress ${isInSyncRegion ? '' : 'dimmed'}`}
                style={{ width: `${progressPercent}%` }}
              />

              {/* Section divider lines - rendered on top of progress */}
              {sections.length > 0 && sections.map((section) => {
                const startPercent = (section.startTime / duration) * 100;
                if (startPercent < 0.5) return null;
                return (
                  <div
                    key={`divider-${section.id}`}
                    className="section-divider"
                    style={{ left: `${startPercent}%` }}
                  />
                );
              })}

              {/* Sync start handle - simple draggable line */}
              {showSyncStartHandle && (
                <div
                  className={`sync-handle ${dragging ? 'dragging' : ''}`}
                  style={{ left: `${syncStartPercent}%` }}
                  onMouseDown={handleSyncDragStart}
                  title={`Beat sync starts at ${formatTime(syncStartTime)} — drag to adjust`}
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

          {/* Section labels row - below the bar */}
          {sections.length > 0 && (
            <div className="section-labels-row">
              {sections.map((section) => {
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
                    onMouseEnter={(e) => handleSectionHover(section, e)}
                    onMouseLeave={() => handleSectionHover(null)}
                  >
                    <span className="section-label-text">{getShortLabel(section.label)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <span className="time-display duration">{formatTime(duration)}</span>
      </div>

      {/* Section hover card */}
      {hoveredSection && (
        <div 
          className="section-hover-card"
          style={{ 
            left: `${Math.min(Math.max(hoverPosition.x, 150), window.innerWidth - 150)}px`,
            top: `${hoverPosition.y - 10}px`,
          }}
        >
          <div className="section-hover-title">{hoveredSection.label}</div>
          <div className="section-hover-times">
            <span>{formatTime(hoveredSection.startTime)}</span>
            <span className="section-hover-arrow">→</span>
            <span>{formatTime(hoveredSection.endTime)}</span>
          </div>
          <div className="section-hover-duration">
            Duration: {Math.round(hoveredSection.endTime - hoveredSection.startTime)}s
          </div>
          
          {/* Chord progression for this section */}
          {getChordsForSection(hoveredSection).length > 0 && (
            <div className="section-hover-chords">
              <span className="section-hover-label">Chords (estimated):</span>
              <span className="section-chord-list">
                {getChordsForSection(hoveredSection).join(' → ')}
              </span>
            </div>
          )}
          
          {/* Key change in this section */}
          {(() => {
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
          {(() => {
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
        {hasSelection && (
          <div className="section-actions">
            <span className="section-actions-label">
              {getSelectionLabel()}:
            </span>
            {selectedSectionIds.length >= 2 && onCombineSections && (
              <button 
                className="section-action-btn"
                onClick={onCombineSections}
                title="Combine selected sections into one"
              >
                <span className="material-symbols-outlined">merge</span>
                <span>Combine</span>
              </button>
            )}
            {selectedSectionIds.length === 1 && onSplitSection && (
              <button 
                className="section-action-btn"
                onClick={() => {
                  const section = sections.find(s => s.id === selectedSectionIds[0]);
                  if (section && currentTime > section.startTime && currentTime < section.endTime) {
                    onSplitSection(section.id, currentTime);
                  }
                }}
                disabled={!sections.some(s => 
                  s.id === selectedSectionIds[0] && 
                  currentTime > s.startTime && 
                  currentTime < s.endTime
                )}
                title="Split section at current playback position"
              >
                <span className="material-symbols-outlined">vertical_split</span>
                <span>Split here</span>
              </button>
            )}
            {onExtendSelection && (
              <div className="section-nudge-controls">
                <span className="nudge-label">Nudge selection:</span>
                <button 
                  className="nudge-btn has-tooltip"
                  onClick={() => onExtendSelection('start', -1)}
                  data-tooltip="Extend start 1 measure earlier"
                >
                  <span className="material-symbols-outlined">first_page</span>
                </button>
                <button 
                  className="nudge-btn has-tooltip"
                  onClick={() => onExtendSelection('start', 1)}
                  data-tooltip="Shrink start 1 measure later"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
                <span className="nudge-divider">|</span>
                <button 
                  className="nudge-btn has-tooltip"
                  onClick={() => onExtendSelection('end', -1)}
                  data-tooltip="Shrink end 1 measure earlier"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button 
                  className="nudge-btn has-tooltip"
                  onClick={() => onExtendSelection('end', 1)}
                  data-tooltip="Extend end 1 measure later"
                >
                  <span className="material-symbols-outlined">last_page</span>
                </button>
              </div>
            )}
            <button 
              className="section-action-btn deselect"
              onClick={onClearSelection}
              title="Deselect all sections"
            >
              <span className="material-symbols-outlined">deselect</span>
              <span>Deselect</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaybackBar;
