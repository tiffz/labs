import React, { useCallback, useRef, useState } from 'react';
import type { Section } from '../utils/sectionDetector';
import type { LoopRegion } from '../hooks/useBeatSync';

interface PlaybackBarProps {
  currentTime: number;
  duration: number;
  musicStartTime: number;
  syncStartTime: number;
  onSeek: (time: number) => void;
  onSyncStartChange: (time: number) => void;
  isInSyncRegion: boolean;
  /** Detected sections to display as colored markers */
  sections?: Section[];
  /** Current loop region (if any) */
  loopRegion?: LoopRegion | null;
  /** Whether looping is enabled */
  loopEnabled?: boolean;
  /** Currently selected section IDs (for highlighting) */
  selectedSectionIds?: string[];
  /** Called when user clicks a section */
  onSelectSection?: (section: Section, extendSelection: boolean) => void;
  /** Called to clear section selection */
  onClearSelection?: () => void;
  /** Whether section detection is running */
  isDetectingSections?: boolean;
  /** Called to combine selected sections */
  onCombineSections?: () => void;
  /** Called to split section at current time */
  onSplitSection?: (sectionId: string, splitTime: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const PlaybackBar: React.FC<PlaybackBarProps> = ({
  currentTime,
  duration,
  musicStartTime,
  syncStartTime,
  onSeek,
  onSyncStartChange,
  isInSyncRegion,
  sections = [],
  loopRegion = null,
  loopEnabled = false,
  selectedSectionIds = [],
  onSelectSection,
  onClearSelection,
  isDetectingSections = false,
  onCombineSections,
  onSplitSection,
}) => {
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
      
      // Auto-select the section at this timestamp if not already selected
      if (sections.length > 0 && onSelectSection) {
        const sectionAtTime = sections.find(
          (s) => clampedTime >= s.startTime && clampedTime < s.endTime
        );
        if (sectionAtTime && !selectedSectionIds.includes(sectionAtTime.id)) {
          onSelectSection(sectionAtTime, false);
        }
      }
    },
    [duration, onSeek, getTimeFromEvent, dragging, sections, selectedSectionIds, onSelectSection]
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
      } else if (onSelectSection) {
        onSelectSection(section, e.shiftKey);
      }
    },
    [onSelectSection, onClearSelection, selectedSectionIds]
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
    
    if (firstMeasure === lastMeasure) {
      return `M${firstMeasure}`;
    }
    return `M${firstMeasure}–${lastMeasure}`;
  };

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
            left: `${Math.min(Math.max(hoverPosition.x, 120), window.innerWidth - 120)}px`,
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
