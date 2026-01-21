import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { TimeSignature, ParsedRhythm, RepeatMarker } from '../types';
import { notationToGrid, gridToNotation, getLinkedPositions, type SequencerCell } from '../utils/sequencerUtils';
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

  const [localGrid, setLocalGrid] = useState(grid);
  // Calculate actual measures + one ghost measure
  const calculateNumMeasures = useCallback((gridLength: number) => {
    const actualMeasures = Math.max(1, Math.ceil((gridLength || 0) / sixteenthsPerMeasure));
    return actualMeasures + 1; // Always show one ghost measure
  }, [sixteenthsPerMeasure]);

  const [numMeasures, setNumMeasures] = useState(() => calculateNumMeasures(grid.actualLength || 0));
  const isExternalUpdateRef = useRef(false);
  const dragStateRef = useRef({ isDragging: false, dragStart: null as { position: number; sound: SequencerCell } | null });

  // Sync grid when notation changes externally (but debounce to avoid loops)
  useEffect(() => {
    if (isExternalUpdateRef.current) {
      isExternalUpdateRef.current = false;
      return;
    }

    const calculatedGrid = notationToGrid(notation, timeSignature);
    const actualMeasures = Math.max(1, Math.ceil((calculatedGrid.actualLength || 0) / sixteenthsPerMeasure));
    // Show exactly one extra ghost measure
    const displayMeasures = actualMeasures + 1;
    const requiredCells = displayMeasures * sixteenthsPerMeasure;

    // Ensure grid has exactly the right number of cells (no more, no less)
    let cells = calculatedGrid.cells;
    if (cells.length < requiredCells) {
      const extendedCells = [...cells];
      while (extendedCells.length < requiredCells) {
        extendedCells.push(null);
      }
      cells = extendedCells;
    } else if (cells.length > requiredCells) {
      cells = cells.slice(0, requiredCells);
    }

    setLocalGrid({
      ...calculatedGrid,
      cells,
    });
    setNumMeasures(displayMeasures);
  }, [notation, timeSignature, sixteenthsPerMeasure]);

  // Update notation when grid changes, removing empty trailing measures
  const updateNotation = useCallback((newGrid: typeof localGrid) => {
    // Remember the original content boundary (before ghost measure padding)
    // This is crucial: we should NOT extend notes into ghost measure padding
    const originalActualLength = newGrid.actualLength || 0;

    // First, ensure we have enough cells for display (one ghost measure)
    const currentActualMeasures = Math.max(1, Math.ceil(originalActualLength / sixteenthsPerMeasure));
    const displayMeasures = currentActualMeasures + 1;
    const requiredCells = displayMeasures * sixteenthsPerMeasure;

    // Extend cells if needed BEFORE calculating actualLength
    let cells = newGrid.cells;
    if (cells.length < requiredCells) {
      const extendedCells = [...cells];
      while (extendedCells.length < requiredCells) {
        extendedCells.push(null);
      }
      cells = extendedCells;
    } else if (cells.length > requiredCells) {
      cells = cells.slice(0, requiredCells);
    }

    // Now find the last position with a sound in the extended cells
    let lastSoundIndex = -1;
    for (let idx = cells.length - 1; idx >= 0; idx--) {
      if (cells[idx] !== null) {
        lastSoundIndex = idx;
        break;
      }
    }

    // Calculate actual length (up to last sound + its duration)
    // Count consecutive nulls after the last sound to determine note duration
    // IMPORTANT: Don't count ghost measure padding as note extensions!
    let actualLength = 0;
    if (lastSoundIndex >= 0) {
      // Find where the last note ends by counting consecutive nulls
      let endPos = lastSoundIndex;

      // Determine the boundary for counting nulls:
      // - If the last sound is within the original content, only count nulls up to the original boundary
      // - If the last sound is beyond the original content (user clicked in ghost measure), 
      //   only count that single note (don't extend into further padding)
      let countBoundary: number;
      if (lastSoundIndex < originalActualLength) {
        // Sound is within original content - don't extend into ghost measure
        countBoundary = originalActualLength;
      } else {
        // Sound is in ghost measure region - single sixteenth note, no automatic extension
        // The user can drag to extend if they want longer notes
        countBoundary = lastSoundIndex + 1;
      }

      // Count nulls until we hit another sound or reach the boundary
      while (endPos < countBoundary - 1 && endPos < cells.length - 1 && cells[endPos + 1] === null) {
        endPos++;
      }
      actualLength = endPos + 1;
    }

    // Create grid with calculated actualLength
    const gridWithLength = {
      ...newGrid,
      cells,
      actualLength: actualLength || undefined,
    };

    // Update numMeasures based on actualLength
    const newActualMeasures = Math.max(1, Math.ceil((actualLength || 0) / sixteenthsPerMeasure));
    const newDisplayMeasures = newActualMeasures + 1; // Exactly one ghost measure
    setNumMeasures(newDisplayMeasures);

    // Convert to notation - gridToNotation will use actualLength to stop at the right place
    // Pass parsedRhythm.repeats to preserve section repeats during edit
    const newNotation = gridToNotation(gridWithLength, parsedRhythm.repeats);
    const cleanedNotation = notation.replace(/[\s\n]/g, '');
    const cleanedNewNotation = newNotation.replace(/[\s\n]/g, '');

    // Note: We compare cleaned notation to avoid loops if only formatting changed
    // BUT we must allow formatting changes if they add repeats. 
    // If we only compare cleaned, we might miss the repeat addition?
    // Wait. `newNotation` HAS repeats. `notation` HAS repeats.
    // `cleanedNotation` removes whitespace. `|: | |` -> `|:||`?
    // If we strip whitespace, do we strip `|:`?
    // `replace(/[\s\n]/g, '')` only strips whitespace.
    // So `|:` remains.
    // So if repeats match, cleaned matches.

    if (cleanedNewNotation !== cleanedNotation) {
      isExternalUpdateRef.current = true;
      onNotationChange(newNotation);
    }
  }, [notation, onNotationChange, sixteenthsPerMeasure, parsedRhythm.repeats]);

  const handleCellClick = useCallback((position: number, soundIndex: number) => {
    const sound = SOUNDS[soundIndex]?.sound || null;
    if (!sound) return;

    setLocalGrid(prevGrid => {
      // Determine if the clicked position is a Ghost or Source
      // We do this by checking if it links TO something else as a Source.

      // Calculate measure index of the click
      const measureIdx = Math.floor(position / sixteenthsPerMeasure);

      // Check if this measure is a GHOST in any repeat structure
      let isGhost = false;
      if (parsedRhythm.repeats) {
        for (const r of parsedRhythm.repeats) {
          if (r.type === 'measure') {
            if (r.repeatMeasures.includes(measureIdx)) isGhost = true;
          } else if (r.type === 'section') {
            if (measureIdx > r.endMeasure) {
              // Check if it falls within the repeats of this section
              const len = r.endMeasure - r.startMeasure + 1;
              const totalLen = len * (r.repeatCount + 1); // Source + Repeats
              const relative = measureIdx - r.startMeasure;
              if (relative < totalLen) isGhost = true;
            }
          }
        }
      }

      // Find all linked positions (Source + Ghosts)
      // FIX Phase 28c: Divergence on Edit
      // If we click a Ghost, we do NOT want to update the Source (Link).
      // We want to update ONLY the Ghost (Diverge).
      // If we click a Source, we generally want to update Ghosts (Keep Link).

      let linkedPositions: number[] = [position];
      if (!isGhost) {
        linkedPositions = getLinkedPositions(position, parsedRhythm.repeats || [], sixteenthsPerMeasure);
      }

      const maxPos = Math.max(position, ...linkedPositions);

      // Ensure we have enough cells
      const newCells = [...prevGrid.cells];
      while (newCells.length <= maxPos) {
        newCells.push(null);
      }

      // Determine new state based on the CLICKED cell
      const currentSound = newCells[position];
      const newState = (currentSound === sound) ? null : sound;

      // Apply to all linked positions
      linkedPositions.forEach(pos => {
        newCells[pos] = newState;
      });

      const newGrid = { ...prevGrid, cells: newCells };

      // Update notation asynchronously to avoid state conflicts
      isExternalUpdateRef.current = true;
      setTimeout(() => {
        updateNotation(newGrid);
      }, 0);

      return newGrid;
    });
  }, [updateNotation, parsedRhythm.repeats, sixteenthsPerMeasure]);

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

        // Update all positions in the range
        setLocalGrid(prevGrid => {
          const newCells = [...prevGrid.cells];

          // Determine max reach required for Linked Editing in this range
          let maxReach = endPos;

          // First pass: Calculate linked targets for the range
          const updates: number[] = [];
          for (let pos = startPos; pos <= endPos; pos++) {
            // Calculate measure index of the position
            const measureIdx = Math.floor(pos / sixteenthsPerMeasure);

            // Check if GHOST
            let isGhost = false;
            if (parsedRhythm.repeats) {
              for (const r of parsedRhythm.repeats) {
                if (r.type === 'measure') {
                  if (r.repeatMeasures.includes(measureIdx)) isGhost = true;
                } else if (r.type === 'section') {
                  if (measureIdx > r.endMeasure) {
                    const len = r.endMeasure - r.startMeasure + 1;
                    const totalLen = len * (r.repeatCount + 1);
                    const relative = measureIdx - r.startMeasure;
                    if (relative < totalLen) isGhost = true;
                  }
                }
              }
            }

            let linked: number[] = [pos];
            if (!isGhost) {
              linked = getLinkedPositions(pos, parsedRhythm.repeats || [], sixteenthsPerMeasure);
            }

            linked.forEach(t => {
              updates.push(t);
              if (t > maxReach) maxReach = t;
            });
          }

          // Ensure we have enough cells
          while (newCells.length <= maxReach) {
            newCells.push(null);
          }

          // Apply sound to all linked positions
          updates.forEach(pos => {
            newCells[pos] = dragStart.sound;
          });

          const newGrid = { ...prevGrid, cells: newCells };

          // Update notation asynchronously
          isExternalUpdateRef.current = true;
          setTimeout(() => {
            updateNotation(newGrid);
          }, 0);

          return newGrid;
        });

        // Update drag start to current position for next mouse enter
        dragStateRef.current.dragStart = { position, sound: dragStart.sound };
      }
    }
  }, [updateNotation]);

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
    const newNumMeasures = numMeasures + 1;
    const newCells = [...localGrid.cells];

    // Add a whole rest (16 sixteenths) for the new measure
    for (let i = 0; i < sixteenthsPerMeasure; i++) {
      if (i === 0) {
        newCells.push('rest'); // Start with rest
      } else {
        newCells.push(null); // Extend the rest
      }
    }

    const newGrid = {
      ...localGrid,
      cells: newCells,
      actualLength: newNumMeasures * sixteenthsPerMeasure,
    };
    setLocalGrid(newGrid);
    setNumMeasures(newNumMeasures);
    updateNotation(newGrid);
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

  // Calculate hidden measures (ghosts of section repeats)
  const hiddenMeasureIndices = useMemo(() => {
    const hidden = new Set<number>();
    if (!parsedRhythm.repeats) return hidden;

    parsedRhythm.repeats.forEach(repeat => {
      // FIX Phase 33: Hide ALL ghost measures (repeatCount * blockLength)
      if (repeat.type === 'section' && repeat.repeatCount > 0) {
        const blockLength = repeat.endMeasure - repeat.startMeasure + 1;
        const measuresToHide = blockLength * repeat.repeatCount;
        const startHiddenIndex = repeat.endMeasure + 1;

        for (let i = 0; i < measuresToHide; i++) {
          hidden.add(startHiddenIndex + i);
        }
      }
    });
    return hidden;
  }, [parsedRhythm.repeats]);

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
                                  // Handle click here
                                  if (!dragStateRef.current.isDragging || dragStateRef.current.dragStart?.position === position) {
                                    handleCellClick(position, soundIndex);
                                  }
                                }}
                                onMouseEnter={() => handleCellMouseEnter(position, soundIndex)}
                                type="button"
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
