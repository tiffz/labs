import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import type { TimeSignature, ParsedRhythm, RepeatMarker } from '../types';
import { hiddenMeasureIndices as hiddenMeasureIndicesOf } from '../../shared/rhythm/measureLayout';
import { measureLayoutOf } from '../../shared/rhythm/rhythmParser';
import { notationToGrid, type SequencerCell } from '../utils/sequencerUtils';
import { setStrokeAt } from '../utils/notationEdits';
import { getSixteenthsPerMeasure, getDefaultBeatGrouping, getBeatGroupingInSixteenths } from '../utils/timeSignatureUtils';
import DrumSymbolIcon from './DrumSymbolIcon';

/**
 * Checks if a measure is at the start of a section repeat
 */
function isSectionRepeatStart(measureIndex: number, repeats?: RepeatMarker[]): boolean {
  if (!repeats) return false;
  return repeats.some(r => r.type === 'section' && r.startMeasure === measureIndex);
}

/**
 * Checks if a measure is at the end of a section repeat
 */
function isSectionRepeatEnd(measureIndex: number, repeats?: RepeatMarker[]): { isEnd: boolean; count: number } {
  if (!repeats) return { isEnd: false, count: 0 };
  for (const repeat of repeats) {
    if (repeat.type === 'section' && repeat.endMeasure === measureIndex) {
      return { isEnd: true, count: repeat.repeatCount };
    }
  }
  return { isEnd: false, count: 0 };
}

/**
 * Checks if a measure should be shown as a simile (%)
 */
function isMeasureSimile(measureIndex: number, repeats?: RepeatMarker[]): boolean {
  if (!repeats) return false;
  return repeats.some(r => r.type === 'measure' && r.repeatMeasures.includes(measureIndex));
}

interface RhythmSequencerProps {
  notation: string;
  onNotationChange: (notation: string) => void;
  timeSignature: TimeSignature;
  parsedRhythm: ParsedRhythm;
  currentNote?: { measureIndex: number; noteIndex: number } | null;
  currentMetronomeBeat?: { measureIndex: number; positionInSixteenths: number; isDownbeat: boolean } | null;
}

// SOUNDS array ordered from highest pitch to lowest pitch (top to bottom)
// This matches standard musical notation where higher pitches are at the top
const SOUNDS: Array<{ sound: 'dum' | 'tak' | 'ka' | 'slap' | 'rest'; label: string; char: string }> = [
  { sound: 'ka', label: 'Ka', char: 'K' },      // Highest pitch - rim sound
  { sound: 'tak', label: 'Tak', char: 'T' },    // High pitch - edge sound
  { sound: 'slap', label: 'Slap', char: 'S' },  // Mid pitch - slap sound
  { sound: 'dum', label: 'Dum', char: 'D' },    // Low pitch - bass sound
  { sound: 'rest', label: 'Rest', char: '_' },  // Rest (no sound)
];

const RhythmSequencer: React.FC<RhythmSequencerProps> = ({
  notation,
  onNotationChange,
  timeSignature,
  parsedRhythm,
  currentNote,
  currentMetronomeBeat,
}) => {
  const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);

  // Calculate grid from notation - show actual measures + one ghost measure
  const grid = useMemo(() => {
    const calculatedGrid = notationToGrid(notation, timeSignature);
    // Calculate actual number of measures needed (at least 1)
    const actualMeasures = Math.max(1, Math.ceil((calculatedGrid.actualLength || 0) / sixteenthsPerMeasure));
    // Show one extra ghost measure
    const displayMeasures = actualMeasures + 1;
    const minCells = displayMeasures * sixteenthsPerMeasure;

    // Ensure grid has exactly the right number of cells (no more, no less)
    let cells = calculatedGrid.cells;
    if (cells.length < minCells) {
      const extendedCells = [...cells];
      while (extendedCells.length < minCells) {
        extendedCells.push(null);
      }
      cells = extendedCells;
    } else if (cells.length > minCells) {
      cells = cells.slice(0, minCells);
    }

    return {
      ...calculatedGrid,
      cells,
    };
  }, [notation, timeSignature, sixteenthsPerMeasure]);

  // The grid is derived from the notation; every edit goes through `setStrokeAt`, which edits the
  // notation in place, and the grid follows. (It used to keep its own copy, link copies by its own
  // arithmetic, and rebuild the whole notation from it on every click — losing spaces and repeat
  // signs, and editing the wrong measure after a repeat. notationEdits/sequencer.fuzz cover this.)
  const localGrid = grid;
  const numMeasures = Math.max(1, Math.ceil((grid.actualLength || 0) / sixteenthsPerMeasure)) + 1;
  const dragStateRef = useRef({ isDragging: false, dragStart: null as { position: number; sound: SequencerCell } | null });

  const handleCellClick = useCallback((position: number, soundIndex: number) => {
    const sound = SOUNDS[soundIndex]?.sound || null;
    if (!sound) return;
    // Clicking the stroke already in a cell clears it.
    const next = setStrokeAt(notation, timeSignature, position, grid.cells[position] === sound ? null : sound);
    if (next !== null) onNotationChange(next);
  }, [notation, timeSignature, grid.cells, onNotationChange]);

  const handleCellMouseDown = useCallback((position: number, soundIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sound = SOUNDS[soundIndex]?.sound || null;
    if (!sound) return;

    // Set dragging state immediately using ref for synchronous access
    dragStateRef.current.isDragging = true;
    dragStateRef.current.dragStart = { position, sound };

    // Don't trigger click here - let onClick handle it to avoid double-firing
  }, []);

  const handleCellMouseEnter = useCallback((position: number, soundIndex: number) => {
    // Use ref for synchronous access to drag state
    if (dragStateRef.current.isDragging && dragStateRef.current.dragStart) {
      const sound = SOUNDS[soundIndex]?.sound || null;
      const dragStart = dragStateRef.current.dragStart;

      // If dragging, paint all cells between dragStart and current position
      if (sound === dragStart.sound) {
        const startPos = Math.min(dragStart.position, position);
        const endPos = Math.max(dragStart.position, position);

        // Paint every cell in the range with the dragged stroke.
        let next = notation;
        for (let pos = startPos; pos <= endPos; pos++) {
          next = setStrokeAt(next, timeSignature, pos, dragStart.sound as 'dum' | 'tak' | 'ka' | 'slap' | 'rest') ?? next;
        }
        if (next !== notation) onNotationChange(next);

        // Update drag start to current position for next mouse enter
        dragStateRef.current.dragStart = { position, sound: dragStart.sound };
      }
    }
  }, [notation, timeSignature, onNotationChange]);

  const handleMouseUp = useCallback(() => {
    dragStateRef.current.isDragging = false;
    dragStateRef.current.dragStart = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseleave', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [handleMouseUp]);

  const handleAddMeasure = () => {
    // A measure of rest after a bar; the bar also pads a short last measure.
    onNotationChange(notation.trimEnd() + (notation.trim() ? ' | ' : '') + '_'.repeat(sixteenthsPerMeasure));
  };

  // Calculate which position is currently playing for highlighting
  const getCurrentPosition = useCallback((): number | null => {
    // Prefer the granular metronome beat for smoother 16th-note updates
    if (currentMetronomeBeat) {
      return currentMetronomeBeat.measureIndex * sixteenthsPerMeasure + currentMetronomeBeat.positionInSixteenths;
    }

    if (!currentNote) return null;

    let position = 0;
    for (let m = 0; m < currentNote.measureIndex && m < parsedRhythm.measures.length; m++) {
      position += sixteenthsPerMeasure;
    }

    const measure = parsedRhythm.measures[currentNote.measureIndex];
    if (measure) {
      for (let n = 0; n < currentNote.noteIndex && n < measure.notes.length; n++) {
        position += measure.notes[n].durationInSixteenths;
      }
    }

    return position;
  }, [currentNote, currentMetronomeBeat, parsedRhythm, sixteenthsPerMeasure]);

  // Hidden section passes come from the shared measure layout, like the score's.
  const hiddenMeasureIndices = useMemo(() => hiddenMeasureIndicesOf(measureLayoutOf(parsedRhythm)), [parsedRhythm]);

  const currentPosition = getCurrentPosition();

  // Calculate note ranges for extended note visualization
  const getNoteRange = useCallback((position: number): { start: number; end: number } | null => {
    if (localGrid.cells[position] === null) return null;

    let start = position;
    let end = position;

    // Find start (go backwards to find where note begins)
    while (start > 0 && localGrid.cells[start - 1] === null) {
      start--;
    }

    // Find end (go forwards to find where note ends)
    while (end < localGrid.cells.length - 1 && localGrid.cells[end + 1] === null) {
      end++;
    }

    return { start, end };
  }, [localGrid]);

  return (
    <div className="rhythm-sequencer">
      <div className="sequencer-header">
        <div className="sequencer-help-text">
          Click cells to add sounds. Drag to paint multiple cells. Each box represents a 16th note. Empty cells after a sound extend the note.
        </div>
        <button
          className="sequencer-add-measure-button"
          onClick={handleAddMeasure}
          type="button"
          title="Add another measure"
        >
          + Add Measure
        </button>
      </div>

      <div className="sequencer-grid-container">
        <div className="sequencer-grid-horizontal">
          {/* Sound labels column */}
          <div className="sequencer-sound-column">
            {/* Empty header for measure labels */}
            <div className="sequencer-sound-row-header sequencer-measure-header-spacer"></div>
            {SOUNDS.map(({ sound, label }) => (
              <div key={sound} className="sequencer-sound-row-header">
                <DrumSymbolIcon sound={sound} size={16} />
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* Grid cells - horizontal layout */}
          <div className="sequencer-beats-container">
            {Array.from({ length: numMeasures }).map((_, measureIndex) => {
              // Hide unrolled section repeats
              if (hiddenMeasureIndices.has(measureIndex)) return null;

              // Calculate actual measures from grid
              const actualMeasures = Math.max(1, Math.ceil((localGrid.actualLength || 0) / sixteenthsPerMeasure));
              // The ghost measure is always the last one (numMeasures - 1)
              const isGhostMeasure = measureIndex === numMeasures - 1 && measureIndex >= actualMeasures;

              // Check for repeat markers
              const repeatStart = isSectionRepeatStart(measureIndex, parsedRhythm.repeats);
              const repeatEnd = isSectionRepeatEnd(measureIndex, parsedRhythm.repeats);
              const isSimile = isMeasureSimile(measureIndex, parsedRhythm.repeats);

              return (
                <div key={measureIndex} className={`sequencer-measure ${repeatStart ? 'repeat-start' : ''} ${repeatEnd.isEnd ? 'repeat-end' : ''} ${isSimile ? 'simile-measure' : ''}`}>
                  <div className={`sequencer-measure-label ${isGhostMeasure ? 'ghost-measure' : ''}`}>
                    {measureIndex + 1}
                    {repeatEnd.isEnd && repeatEnd.count > 0 && (
                      <span className="repeat-count">×{repeatEnd.count}</span>
                    )}
                  </div>
                  <div className="sequencer-beats-row">
                    {/* Simile overlay for repeated measures */}
                    {isSimile && (
                      <div className="sequencer-simile-overlay" style={{ zIndex: 10 }}>
                        <span className="simile-symbol">%</span>
                      </div>
                    )}
                    {Array.from({ length: sixteenthsPerMeasure }).map((_, beatIndex) => {
                      const position = measureIndex * sixteenthsPerMeasure + beatIndex;
                      const cellSound = localGrid.cells[position] || null;
                      const isCurrentPosition = currentPosition === position;
                      const noteRange = getNoteRange(position);
                      const isNoteStart = noteRange?.start === position;
                      const isNoteEnd = noteRange?.end === position;
                      const isInNoteRange = noteRange && position >= noteRange.start && position <= noteRange.end;

                      // Calculate if this is a beat group boundary
                      const beatGrouping = getDefaultBeatGrouping(timeSignature);
                      const beatGroupingInSixteenths = getBeatGroupingInSixteenths(beatGrouping, timeSignature);
                      let cumulativePosition = 0;
                      let isBeatGroupBoundary = false;
                      for (const groupSize of beatGroupingInSixteenths) {
                        cumulativePosition += groupSize;
                        if (beatIndex === cumulativePosition - 1 && beatIndex < sixteenthsPerMeasure - 1) {
                          isBeatGroupBoundary = true;
                          break;
                        }
                      }

                      return (
                        <div
                          key={beatIndex}
                          className={`sequencer-beat-cell ${isCurrentPosition ? 'playing' : ''} ${isNoteStart ? 'note-start' : ''} ${isNoteEnd ? 'note-end' : ''} ${isInNoteRange && !isNoteStart && !isNoteEnd ? 'note-extended' : ''} ${isGhostMeasure ? 'ghost-measure' : ''} ${isBeatGroupBoundary ? 'beat-group-boundary' : ''}`}
                          style={isCurrentPosition ? { zIndex: 20, position: 'relative' } : undefined}
                        >
                          {SOUNDS.map(({ sound }, soundIndex) => {
                            const isActive = cellSound === sound;
                            const isEmpty = cellSound === null;

                            return (
                              <button
                                key={sound}
                                className={`sequencer-cell-horizontal ${isActive ? 'active' : ''} ${isEmpty ? 'empty' : ''} ${isCurrentPosition ? 'playing' : ''}`}
                                onMouseDown={(e) => handleCellMouseDown(position, soundIndex, e)}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!dragStateRef.current.isDragging || dragStateRef.current.dragStart?.position === position) {
                                    handleCellClick(position, soundIndex);
                                  }
                                }}
                                onFocus={(e) => e.target.blur()}
                                onMouseEnter={() => handleCellMouseEnter(position, soundIndex)}
                                type="button"
                                tabIndex={-1}
                                title={cellSound ? `${cellSound === 'rest' ? 'Rest' : cellSound.charAt(0).toUpperCase() + cellSound.slice(1)} at position ${position + 1}` : `Empty - click to add ${sound}`}
                              >
                                {isActive && (
                                  <DrumSymbolIcon sound={sound} size={14} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RhythmSequencer;
