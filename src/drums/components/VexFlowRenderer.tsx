import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Beam, Dot, BarlineType } from 'vexflow';
import type { ParsedRhythm, Note, DrumSound, TimeSignature } from '../types';
import { drawDrumSymbol } from '../assets/drumSymbols';
import { getDefaultBeatGrouping, isCompoundTimeSignature, isAsymmetricTimeSignature, getBeatGroupingInSixteenths, getSixteenthsPerMeasure } from '../utils/timeSignatureUtils';
import { findDropTarget, type NotePosition } from '../utils/dropTargetFinder';
import { computeDropPreview } from '../utils/dropPreview';
import { getCurrentDraggedPattern } from './NotePalette';

/** Selection rectangle state for visual feedback */
interface SelectionRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

/** Selection state for notes */
export interface NoteSelectionState {
  startCharPosition: number | null;
  endCharPosition: number | null;
  isSelecting: boolean;
}

interface VexFlowRendererProps {
  rhythm: ParsedRhythm;
  currentNote?: { measureIndex: number; noteIndex: number } | null;
  metronomeEnabled?: boolean;
  currentMetronomeBeat?: { measureIndex: number; positionInSixteenths: number; isDownbeat: boolean } | null;
  onDropPattern?: (pattern: string, charPosition: number) => void;
  dragDropMode?: 'replace' | 'insert';
  notation?: string;
  timeSignature?: TimeSignature;
  /** Current selection state */
  selection?: NoteSelectionState | null;
  /** Callback when selection changes */
  onSelectionChange?: (start: number | null, end: number | null, duration: number) => void;
  /** Callback when selection is dragged to a new position */
  onMoveSelection?: (fromStart: number, fromEnd: number, toPosition: number) => void;
}

/**
 * Maps Darbuka sounds to staff positions
 * Notes on F/4 line, rests centered on B/4 (middle line)
 */
const SOUND_TO_PITCH: Record<DrumSound, string> = {
  dum: 'f/4',
  tak: 'f/4',
  ka: 'f/4',
  slap: 'f/4',
  rest: 'b/4', // Center rests on middle line
};

/**
 * Maps note durations to VexFlow duration strings
 */
const DURATION_MAP: Record<string, string> = {
  sixteenth: '16',
  eighth: '8',
  quarter: 'q',
  half: 'h',
  whole: 'w',
};

/**
 * Creates beams based on beat groupings for proper visual grouping
 * For compound time (6/8, 9/8, 12/8): groups notes by beat groups (e.g., 3 eighth notes)
 * For asymmetric time: groups notes according to custom beat groupings
 */
function createBeamsFromBeatGroups(
  staveNotes: StaveNote[],
  notes: Note[],
  timeSignature: TimeSignature
): Beam[] {
  const beams: Beam[] = [];
  
  // Get beat grouping for this time signature
  const beatGrouping = getDefaultBeatGrouping(timeSignature);
  
  // Convert beat grouping to sixteenths
  const beatGroupingInSixteenths = getBeatGroupingInSixteenths(beatGrouping, timeSignature);
  
  // Track position in measure (in sixteenths)
  let currentPosition = 0;
  let currentNoteIndex = 0;
  
  // Determine if we should use sub-grouping
  // Only sub-group for simple time signatures (4/4, 2/4, etc.)
  // For compound (12/8) and asymmetric (7/8) time, respect the beat grouping
  const useSubGrouping = !isCompoundTimeSignature(timeSignature) && !isAsymmetricTimeSignature(timeSignature);
  
  // Process each beat group
  for (const beatGroupSize of beatGroupingInSixteenths) {
    const groupEndPosition = currentPosition + beatGroupSize;
    
    // For simple time signatures, beam in sub-groups of 4 sixteenth notes (one quarter note beat)
    // For compound/asymmetric time, beam the entire beat group together
    if (useSubGrouping) {
      // Sub-group into quarter-note-sized beams for simple time
      while (currentPosition < groupEndPosition && currentNoteIndex < notes.length) {
        const subGroupEndPosition = Math.min(currentPosition + 4, groupEndPosition);
        let notesInGroup: StaveNote[] = [];
      
      // Collect beamable notes for this sub-group
      while (currentNoteIndex < notes.length && currentPosition < subGroupEndPosition) {
        const note = notes[currentNoteIndex];
        const staveNote = staveNotes[currentNoteIndex];
        
        // Only beam eighth notes and sixteenth notes (including dotted)
        // Exclude rests, quarters, halves, and wholes
        const vexDuration = staveNote.getDuration();
        const isBeamable = note.sound !== 'rest' && 
                          (note.duration === 'eighth' || note.duration === 'sixteenth') &&
                          (vexDuration === '8' || vexDuration === '8d' || vexDuration === '16' || vexDuration === '16d');
        
        if (isBeamable) {
          notesInGroup.push(staveNote);
        } else {
          // Hit a non-beamable note (rest, quarter, etc.)
          // Create beam for accumulated notes
          if (notesInGroup.length > 1) {
            try {
              const beam = new Beam(notesInGroup);
              beams.push(beam);
            } catch {
              // Beam creation failed - notes will keep their individual flags
            }
          }
          notesInGroup = []; // Create new array for next sub-group
        }
        
        currentPosition += note.durationInSixteenths;
        currentNoteIndex++;
      }
      
        // Add beam for remaining notes in this sub-group
        if (notesInGroup.length > 1) {
          try {
            const beam = new Beam(notesInGroup);
            beams.push(beam);
          } catch {
            // Beam creation failed - notes will keep their individual flags
          }
        }
      }
    } else {
      // For compound/asymmetric time, beam the entire beat group together
      let notesInGroup: StaveNote[] = [];
      
      while (currentNoteIndex < notes.length && currentPosition < groupEndPosition) {
        const note = notes[currentNoteIndex];
        const staveNote = staveNotes[currentNoteIndex];
        
        // Only beam eighth notes and sixteenth notes (including dotted)
        // Exclude rests, quarters, halves, and wholes
        const vexDuration = staveNote.getDuration();
        const isBeamable = note.sound !== 'rest' && 
                          (note.duration === 'eighth' || note.duration === 'sixteenth') &&
                          (vexDuration === '8' || vexDuration === '8d' || vexDuration === '16' || vexDuration === '16d');
        
        if (isBeamable) {
          notesInGroup.push(staveNote);
        } else {
          // Hit a non-beamable note (rest, quarter, etc.)
          // Create beam for accumulated notes
          if (notesInGroup.length > 1) {
            try {
              const beam = new Beam(notesInGroup);
              beams.push(beam);
            } catch {
              // Beam creation failed - notes will keep their individual flags
            }
          }
          notesInGroup = []; // Create new array for next sub-group
        }
        
        currentPosition += note.durationInSixteenths;
        currentNoteIndex++;
      }
      
      // Add beam for remaining notes in this beat group
      if (notesInGroup.length > 1) {
        try {
          const beam = new Beam(notesInGroup);
          beams.push(beam);
        } catch {
          // Beam creation failed - notes will keep their individual flags
        }
      }
    }
  }
  
  return beams;
}

const VexFlowRenderer: React.FC<VexFlowRendererProps> = ({ 
  rhythm, 
  currentNote,
  metronomeEnabled = false,
  currentMetronomeBeat = null,
  onDropPattern,
  dragDropMode = 'replace',
  notation = '',
  timeSignature,
  selection = null,
  onSelectionChange,
  onMoveSelection,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const metronomeDotsRef = useRef<Map<string, SVGCircleElement>>(new Map());
  const notePositionsRef = useRef<NotePosition[]>([]);
  const allStaveNoteRefsRef = useRef<Array<{
    staveNote: StaveNote;
    stave: Stave;
    measureIndex: number;
    noteIndex: number;
    note: Note;
  }>>([]);
  
  // Rectangle selection state - using a single ref object for all drag state
  // This prevents issues with stale closures in event handlers
  const dragStateRef = useRef({
    isDrawing: false,
    isDraggingSelection: false,
    startX: 0,
    startY: 0,
    startSvgX: 0,
    startSvgY: 0,
    hasDragged: false,
  });

  // Re-render on window resize to recalculate responsive layout
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Selection rectangle ref for direct DOM manipulation (avoids re-render conflicts with VexFlow)
  const selectionRectRef = useRef<HTMLDivElement | null>(null);
  
  // Helper to update selection rectangle position (direct DOM manipulation)
  const updateSelectionRect = useCallback((rect: SelectionRect | null) => {
    if (!selectionRectRef.current) return;
    
    if (rect) {
      const left = Math.min(rect.startX, rect.currentX);
      const top = Math.min(rect.startY, rect.currentY);
      const width = Math.abs(rect.currentX - rect.startX);
      const height = Math.abs(rect.currentY - rect.startY);
      
      selectionRectRef.current.style.display = width > 2 && height > 2 ? 'block' : 'none';
      selectionRectRef.current.style.left = `${left}px`;
      selectionRectRef.current.style.top = `${top}px`;
      selectionRectRef.current.style.width = `${width}px`;
      selectionRectRef.current.style.height = `${height}px`;
    } else {
      selectionRectRef.current.style.display = 'none';
    }
  }, []);
  
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!containerRef.current || rhythm.measures.length === 0) {
      return;
    }

    // Clear previous rendering
    containerRef.current.innerHTML = '';
    metronomeDotsRef.current.clear();
    notePositionsRef.current = [];

    try {
      // Dynamic measure width based on note count
      // Calculate width for each measure based on its note count
      // For long time signatures, allow measures to expand as needed
      const sixteenthsPerMeasure = getSixteenthsPerMeasure(rhythm.timeSignature);
      const isLongMeasure = sixteenthsPerMeasure > 32; // More than 8/4 equivalent
      
      const calculateMeasureWidth = (measure: typeof rhythm.measures[0]): number => {
        const baseWidth = 120; // Base width for time signature, barlines, etc.
        // Use smaller width per note for long measures to keep them readable
        const widthPerNote = isLongMeasure ? 20 : 25;
        const minWidth = 200;
        // For long time signatures, don't cap the width - let it expand
        // This ensures notes don't escape or overlap
        const maxWidth = isLongMeasure ? Infinity : 850;
        
        const calculatedWidth = baseWidth + (measure.notes.length * widthPerNote);
        return Math.max(minWidth, Math.min(maxWidth, calculatedWidth));
      };

      const measureWidths = rhythm.measures.map(calculateMeasureWidth);
      
      // Layout measures into lines based on available width
      // Use viewport width minus padding for responsive layout
      const containerPadding = 40; // Account for margins and padding
      const sidebarWidth = 280; // Approximate sidebar width
      // For long measures, use a wider base line width
      const baseMaxLineWidth = Math.max(600, Math.min(1200, windowWidth - sidebarWidth - containerPadding));
      const lineHeight = 100;
      const leftMargin = 10;
      const rightMargin = 10;
      
      // Group measures into lines
      const lines: number[][] = []; // Array of arrays of measure indices
      let currentLine: number[] = [];
      let currentLineWidth = leftMargin;
      
      rhythm.measures.forEach((_measure, measureIndex) => {
        const measureWidth = measureWidths[measureIndex];
        
        // For long measures, each one gets its own line
        if (isLongMeasure && measureWidth > baseMaxLineWidth) {
          // If current line has measures, push it first
          if (currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = [];
            currentLineWidth = leftMargin;
          }
          // Put this long measure on its own line
          lines.push([measureIndex]);
        } else if (currentLine.length > 0 && currentLineWidth + measureWidth + rightMargin > baseMaxLineWidth) {
          // Start a new line
          lines.push(currentLine);
          currentLine = [measureIndex];
          currentLineWidth = leftMargin + measureWidth;
        } else {
          // Add to current line
          currentLine.push(measureIndex);
          currentLineWidth += measureWidth;
        }
      });
      
      // Add the last line
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      
      // Calculate actual max line width based on content
      // This ensures the SVG is wide enough for long measures
      const maxActualLineWidth = lines.reduce((maxWidth, lineIndices) => {
        const lineWidth = leftMargin + lineIndices.reduce((sum, idx) => sum + measureWidths[idx], 0) + rightMargin;
        return Math.max(maxWidth, lineWidth);
      }, baseMaxLineWidth);
      
      const numLines = lines.length;
      // Add extra space at bottom for metronome dots (15px)
      const totalHeight = numLines * lineHeight + 40 + (metronomeEnabled ? 15 : 0);
      const totalWidth = Math.max(baseMaxLineWidth, maxActualLineWidth) + 20;

      // Create SVG renderer
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(totalWidth, totalHeight);
      const context = renderer.getContext();

      // Store references to all StaveNotes for later symbol drawing and highlighting
      interface StaveNoteRef {
        staveNote: StaveNote;
        stave: Stave;
        measureIndex: number;
        noteIndex: number;
        note: Note;
      }
      const allStaveNoteRefs: StaveNoteRef[] = [];
      // Clear refs at start of rendering
      allStaveNoteRefsRef.current = [];
      notePositionsRef.current = [];

      // Render each line
      lines.forEach((lineIndices, lineIndex) => {
        let xPosition = leftMargin;
        const yPosition = 40 + lineIndex * lineHeight;
        
        lineIndices.forEach((measureIndex) => {
          const measure = rhythm.measures[measureIndex];
          const measureWidth = measureWidths[measureIndex];
        
        // Create a stave for each measure with 5 lines (standard staff)
        const stave = new Stave(xPosition, yPosition, measureWidth, { numLines: 5 });

          // Add time signature to first measure only
        if (measureIndex === 0) {
          stave.addTimeSignature(`${rhythm.timeSignature.numerator}/${rhythm.timeSignature.denominator}`);
        }

          // Add repeat barline at the end of the last measure
          if (measureIndex === rhythm.measures.length - 1) {
            stave.setEndBarType(BarlineType.REPEAT_END);
        }

        stave.setContext(context).draw();
        
        // Add measure number above the stave using SVG text element (left-aligned)
        // Only show measure numbers if there are more than 3 measures
        // Position it lower, closer to the bottom measure to avoid confusion
        if (rhythm.measures.length > 3) {
          const svgElement = containerRef.current?.querySelector('svg');
          if (svgElement) {
            const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElement.setAttribute('x', String(xPosition));
            textElement.setAttribute('y', String(yPosition + 15));
            textElement.setAttribute('font-family', 'Arial');
            textElement.setAttribute('font-size', '10');
            textElement.setAttribute('fill', '#666');
            textElement.setAttribute('text-anchor', 'start');
            textElement.setAttribute('dominant-baseline', 'baseline');
            textElement.textContent = `${measureIndex + 1}`;
            svgElement.appendChild(textElement);
          }
        }

        // Convert measure notes to VexFlow StaveNotes
          const staveNotes = measure.notes.map((note: Note, noteIndex: number) => {
          let duration = DURATION_MAP[note.duration] || 'q';
          const pitch = SOUND_TO_PITCH[note.sound];
          
          // Handle rests
          const isRest = note.sound === 'rest';
          
          // Add 'd' suffix for dotted notes BEFORE 'r' for rests
          // VexFlow format: duration + 'd' + 'r' (e.g., 'qdr' for dotted quarter rest)
          if (note.isDotted) {
            duration += 'd';
          }
          
          if (isRest) {
            duration += 'r'; // Add 'r' suffix for rests (e.g., 'qr' for quarter rest, 'qdr' for dotted quarter rest)
          }
          
          const staveNote = new StaveNote({
            keys: [pitch],
            duration: duration,
            clef: 'percussion',
            autoStem: false, // Disable auto-stemming so we have full control
          });

          // Ensure stems are visible for all notes (except whole notes and rests)
          // Use stems up for standard notation
          // Whole notes should never have stems - check both duration string and actual duration
          const isWholeNote = note.duration === 'whole' || duration === 'w' || duration === 'wr';
          if (isRest || isWholeNote) {
            // Explicitly disable stem for whole notes and rests
            staveNote.setStemDirection(0); // 0 = no stem
            // Also try to hide the stem element if it exists
            try {
              staveNote.setStemStyle({ visible: false });
            } catch {
              // Ignore if method doesn't exist
            }
          } else {
            staveNote.setStemDirection(1); // 1 = up (standard direction)
          }

          // Explicitly add dot modifier for dotted notes to ensure it's visible
          if (note.isDotted) {
            Dot.buildAndAttach([staveNote], { all: true });
          }

            // Store reference for later symbol drawing
            const ref = {
              staveNote,
              stave,
              measureIndex,
              noteIndex,
              note,
            };
            allStaveNoteRefs.push(ref);
            allStaveNoteRefsRef.current.push(ref);

          return staveNote;
        });

        if (staveNotes.length > 0) {
          // Create a voice and add the notes
          const beatsPerMeasure = rhythm.timeSignature.numerator;
          const beatValue = rhythm.timeSignature.denominator;
          
          const voice = new Voice({
            numBeats: beatsPerMeasure,
            beatValue: beatValue,
          });
          
          voice.setStrict(false); // Allow incomplete measures
          voice.addTickables(staveNotes);

            // Create beams BEFORE formatting so VexFlow knows not to draw flags
            const beams = createBeamsFromBeatGroups(
              staveNotes,
              measure.notes,
              rhythm.timeSignature
            );

            // Format - this calculates stem positions
            const formatter = new Formatter();
            formatter.joinVoices([voice]).format([voice], measureWidth - 60);

            // Draw voice
            voice.draw(context, stave);
            
            // Remove stems from whole notes and rests after drawing
            staveNotes.forEach((note, noteIndex) => {
              const originalNote = measure.notes[noteIndex];
              const isRest = originalNote.sound === 'rest';
              const noteDuration = note.getDuration();
              const isWholeNote = originalNote.duration === 'whole' || noteDuration === 'w' || noteDuration === 'wr';
              
              if (isRest || isWholeNote) {
                const svgEl = note.getSVGElement();
                if (svgEl) {
                  // Remove all stem elements
                  const stemEls = svgEl.querySelectorAll('.vf-stem, path[class*="stem"], line[class*="stem"], .stem, [class*="stem"]');
                  stemEls.forEach((el) => el.remove());
                }
              }
            });
            
            // Workaround for VexFlow bug: manually draw stems that weren't rendered
            staveNotes.forEach((note, noteIndex) => {
              const originalNote = measure.notes[noteIndex];
              const isRest = originalNote.sound === 'rest';
              const noteDuration = note.getDuration();
              const isWholeNote = originalNote.duration === 'whole' || noteDuration === 'w' || noteDuration === 'wr';
              
              // Skip whole notes and rests
              if (isRest || isWholeNote) {
                return;
              }
              
              // For other notes, check if stem needs to be drawn
              const stem = note.getStem();
              if (stem) {
                const svgEl = note.getSVGElement();
                const stemEls = svgEl?.querySelectorAll('.vf-stem, path[class*="stem"], line[class*="stem"]');
                
                // If note has a stem object but no stem SVG elements, force draw it
                if (!stemEls || stemEls.length === 0) {
                  try {
                    // Draw the stem
                    stem.setContext(context).draw();
                    
                    // Stem drawn successfully
                  } catch {
                    // Stem drawing failed - VexFlow bug
                  }
                }
              }
            });
            
            // Draw beams and track which ones succeed
            const successfullyBeamedNotes = new Set<StaveNote>();
            beams.forEach((beam) => {
              try {
                beam.setContext(context).draw();
                // Beam drew successfully - track these notes
                const beamNotes = beam.getNotes() as StaveNote[];
                beamNotes.forEach(note => successfullyBeamedNotes.add(note as StaveNote));
              } catch {
                // Beam drawing failed - notes will keep their individual flags
              }
            });
            
            // Remove flags ONLY from notes that were successfully beamed
            if (containerRef.current && successfullyBeamedNotes.size > 0) {
              const svg = containerRef.current.querySelector('svg');
              if (svg) {
                successfullyBeamedNotes.forEach(note => {
                  const svgElement = note.getSVGElement();
                  if (svgElement) {
                    // Remove flag elements (but NOT stems!)
                    // Try multiple selectors to catch all flag variations
                    const flagSelectors = [
                      '.vf-flag',
                      'path[class*="flag"]',
                      'g[class*="flag"]',
                      '[class*="vf-flag"]'
                    ];
                    
                    flagSelectors.forEach(selector => {
                      const flags = svgElement.querySelectorAll(selector);
                      flags.forEach(flag => {
                        // Double-check it's not a stem before removing
                        const classList = (flag as SVGElement).getAttribute('class') || '';
                        if (!classList.includes('stem')) {
                          flag.remove();
                        }
                      });
                    });
                  }
                });
              }
            }
          }
          
          // Move to next measure position on this line
          xPosition += measureWidth;
        });
      });
      
      // Track note positions AFTER all rendering is complete (so SVG elements exist)
      // We need to do this after all measures are drawn because VexFlow needs the full SVG context
      if (notation && timeSignature) {
        notePositionsRef.current = []; // Clear and rebuild
        
        let charPosition = 0;
        
        // First pass: collect all note positions
        const tempPositions: Array<{
          measureIndex: number;
          noteIndex: number;
          x: number;
          y: number;
          width: number;
          height: number;
          charPosition: number;
          durationInSixteenths: number;
          staveY: number;
          isTiedFrom?: boolean;
          isTiedTo?: boolean;
        }> = [];
        
        rhythm.measures.forEach((_measure, measureIndex) => {
          const measureRefs = allStaveNoteRefsRef.current
            .filter(ref => ref.measureIndex === measureIndex)
            .sort((a, b) => a.noteIndex - b.noteIndex); // Ensure correct order
          
          measureRefs.forEach((ref, refIndex) => {
            try {
              const bounds = ref.staveNote.getBoundingBox();
              if (bounds) {
                const noteX = bounds.getX();
                const noteYRelativeToStave = bounds.getY();
                const noteHeight = bounds.getH();
                
                // Calculate time-proportional width instead of using visual bounding box width
                // This is critical for allowing drops in the middle of long notes (whole notes, tied notes)
                // The visual bounding box width is just the notehead, but we need the time extent
                let timeProportionalWidth: number;
                
                if (refIndex < measureRefs.length - 1) {
                  // Use distance to next note as the width
                  const nextBounds = measureRefs[refIndex + 1].staveNote.getBoundingBox();
                  if (nextBounds) {
                    timeProportionalWidth = nextBounds.getX() - noteX;
                  } else {
                    // Fallback to visual width
                    timeProportionalWidth = bounds.getW();
                  }
                } else {
                  // Last note in measure - use distance to end of stave
                  const staveWidth = ref.stave.getWidth();
                  const staveX = ref.stave.getX();
                  const measureEndX = staveX + staveWidth - 20; // Account for barline padding
                  timeProportionalWidth = Math.max(bounds.getW(), measureEndX - noteX);
                }
                
                // Get absolute Y position: note Y relative to stave + stave Y position
                const staveY = ref.stave.getY();
                const noteY = noteYRelativeToStave + staveY;
                
                tempPositions.push({
                  measureIndex: ref.measureIndex,
                  noteIndex: ref.noteIndex,
                  x: noteX,
                  y: noteY,
                  width: timeProportionalWidth, // Use time-proportional width, not visual width
                  height: noteHeight,
                  charPosition: charPosition,
                  durationInSixteenths: ref.note.durationInSixteenths,
                  staveY: staveY,
                  isTiedFrom: ref.note.isTiedFrom,
                  isTiedTo: ref.note.isTiedTo,
                });
                
                charPosition += ref.note.durationInSixteenths;
              }
            } catch (error) {
              console.error('Error getting bounds for note after rendering:', ref.measureIndex, ref.noteIndex, error);
            }
          });
        });
        
        // Second pass: calculate tied group bounds for each note
        // A tied group is a sequence of consecutive notes connected by ties
        for (let i = 0; i < tempPositions.length; i++) {
          const pos = tempPositions[i];
          let groupStart = pos.charPosition;
          let groupEnd = pos.charPosition + pos.durationInSixteenths;
          
          // Walk backwards to find the start of the tied group
          if (pos.isTiedFrom) {
            for (let j = i - 1; j >= 0; j--) {
              const prevPos = tempPositions[j];
              groupStart = prevPos.charPosition;
              if (!prevPos.isTiedFrom) break; // Found the start
            }
          }
          
          // Walk forwards to find the end of the tied group
          if (pos.isTiedTo) {
            for (let j = i + 1; j < tempPositions.length; j++) {
              const nextPos = tempPositions[j];
              groupEnd = nextPos.charPosition + nextPos.durationInSixteenths;
              if (!nextPos.isTiedTo) break; // Found the end
            }
          }
          
          notePositionsRef.current.push({
            ...pos,
            tiedGroupStart: (pos.isTiedFrom || pos.isTiedTo) ? groupStart : undefined,
            tiedGroupEnd: (pos.isTiedFrom || pos.isTiedTo) ? groupEnd : undefined,
          });
        }
      }
      
      // Draw custom symbols and highlighting using stored StaveNote references
          const svgElement = containerRef.current?.querySelector('svg');
          if (svgElement) {
        allStaveNoteRefs.forEach(({ staveNote, stave, measureIndex, noteIndex, note }) => {
              // Highlight current note with red
              const isCurrentNote = currentNote && 
                currentNote.measureIndex === measureIndex && 
                currentNote.noteIndex === noteIndex;
              
              if (isCurrentNote) {
                // Highlight the notehead in red
                const noteheadElements = staveNote.getSVGElement()?.querySelectorAll('.vf-notehead, path[class*="notehead"], ellipse[class*="notehead"]');
                noteheadElements?.forEach((el) => {
                  (el as SVGElement).style.fill = '#ef4444';
                  (el as SVGElement).style.stroke = '#ef4444';
                });
                
                // Highlight the stem in red
                const stemElements = staveNote.getSVGElement()?.querySelectorAll('.vf-stem, path[class*="stem"], line[class*="stem"]');
                stemElements?.forEach((el) => {
                  (el as SVGElement).style.stroke = '#ef4444';
                });
              }
              
              if (note && note.sound !== 'rest') {
            // Get the note's x position using VexFlow's API
            const noteX = staveNote.getAbsoluteX() + 10; // Center offset
            const noteY = stave.getYForLine(2); // Middle line
                
                // Draw custom drum symbol using shared utility
                drawDrumSymbol(svgElement, noteX, noteY, note.sound);
              }
            });
          }
      
      // Draw ties for notes that span measure boundaries
      // Use clean SVG paths for proper tie rendering
      for (let i = 0; i < allStaveNoteRefs.length - 1; i++) {
        const currentRef = allStaveNoteRefs[i];
        const nextRef = allStaveNoteRefs[i + 1];
        
        // Check if current note is tied to the next
        if (currentRef.note.isTiedTo && nextRef.note.isTiedFrom) {
          const isConsecutive = 
            (nextRef.measureIndex === currentRef.measureIndex && nextRef.noteIndex === currentRef.noteIndex + 1) ||
            (nextRef.measureIndex === currentRef.measureIndex + 1 && nextRef.noteIndex === 0 && 
             currentRef.noteIndex === rhythm.measures[currentRef.measureIndex].notes.length - 1);
          
          if (isConsecutive) {
            try {
              const sameStaveLine = currentRef.stave.getY() === nextRef.stave.getY();
              const firstX = currentRef.staveNote.getAbsoluteX() + 12;
              const noteY = currentRef.stave.getYForLine(4) + 5; // Below staff area
              
              if (sameStaveLine) {
                // Same line: draw a clean bezier tie curve
                const secondX = nextRef.staveNote.getAbsoluteX() - 2;
                const distance = secondX - firstX;
                const curveHeight = Math.min(18, Math.max(12, distance * 0.15));
                const controlX1 = firstX + distance * 0.3;
                const controlX2 = firstX + distance * 0.7;
                
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                // Use cubic bezier for smoother curve
                path.setAttribute('d', `M ${firstX} ${noteY} C ${controlX1} ${noteY + curveHeight}, ${controlX2} ${noteY + curveHeight}, ${secondX} ${noteY}`);
                path.setAttribute('stroke', '#000');
                path.setAttribute('stroke-width', '2');
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke-linecap', 'round');
                path.setAttribute('class', 'tie-curve');
                svgElement.appendChild(path);
              } else {
                // Cross-line tie: draw simple curved strokes like standard music notation
                // Both curves should curve DOWNWARD (same direction as normal ties)
                // The continuation "head" should be very short and positioned slightly offset
                // to minimize visual conflict with same-line ties
                
                // First note: tie extending from note toward the right edge
                const staveWidth = currentRef.stave.getWidth();
                const staveX = currentRef.stave.getX();
                const tailEndX = Math.min(firstX + 35, staveX + staveWidth - 15);
                const tailCurveHeight = 10;
                
                const tailPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const tailMidX = (firstX + tailEndX) / 2;
                tailPath.setAttribute('d', 
                  `M ${firstX} ${noteY} Q ${tailMidX} ${noteY + tailCurveHeight}, ${tailEndX} ${noteY + 2}`
                );
                tailPath.setAttribute('stroke', '#000');
                tailPath.setAttribute('stroke-width', '2');
                tailPath.setAttribute('fill', 'none');
                tailPath.setAttribute('stroke-linecap', 'round');
                tailPath.setAttribute('class', 'tie-curve cross-line-tie-tail');
                svgElement.appendChild(tailPath);
                
                // Second note: short tie coming into the note from the left
                // Curves DOWNWARD like normal ties, but very short (15px)
                // Positioned slightly higher than same-line ties to reduce overlap
                const secondX = nextRef.staveNote.getAbsoluteX() - 2;
                const headStartX = secondX - 15; // Very short - only 15px
                const nextNoteY = nextRef.stave.getYForLine(4) + 3; // Slightly higher
                const headCurveHeight = 6; // Small curve
                
                const headPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                // Curve DOWNWARD like normal ties
                headPath.setAttribute('d', 
                  `M ${headStartX} ${nextNoteY + 1} Q ${(headStartX + secondX) / 2} ${nextNoteY + headCurveHeight}, ${secondX} ${nextNoteY}`
                );
                headPath.setAttribute('stroke', '#000');
                headPath.setAttribute('stroke-width', '2');
                headPath.setAttribute('fill', 'none');
                headPath.setAttribute('stroke-linecap', 'round');
                headPath.setAttribute('class', 'tie-curve cross-line-tie-head');
                svgElement.appendChild(headPath);
              }
            } catch (error) {
              console.error('Error drawing tie:', error);
            }
          }
        }
      }
      
      // Draw selection highlighting as continuous boxes per stave line
      if (selection && selection.startCharPosition !== null && selection.endCharPosition !== null && svgElement) {
        const { startCharPosition, endCharPosition } = selection;
        
        // Group selected notes by stave line (Y position)
        const selectedNotesByLine: Map<number, { minX: number; maxX: number; staveY: number }> = new Map();
        
        allStaveNoteRefs.forEach(({ staveNote, stave, note }) => {
          // Calculate the note's character range
          let noteCharPosition = 0;
          for (let i = 0; i < allStaveNoteRefs.length; i++) {
            if (allStaveNoteRefs[i].staveNote === staveNote) break;
            noteCharPosition += allStaveNoteRefs[i].note.durationInSixteenths;
          }
          const noteEndPosition = noteCharPosition + note.durationInSixteenths;
          
          // Check if note overlaps with selection
          if (noteCharPosition < endCharPosition && noteEndPosition > startCharPosition) {
            try {
              const bounds = staveNote.getBoundingBox();
              if (bounds) {
                const staveY = stave.getY();
                const existing = selectedNotesByLine.get(staveY);
                if (existing) {
                  existing.minX = Math.min(existing.minX, bounds.getX());
                  existing.maxX = Math.max(existing.maxX, bounds.getX() + bounds.getW());
                } else {
                  selectedNotesByLine.set(staveY, {
                    minX: bounds.getX(),
                    maxX: bounds.getX() + bounds.getW(),
                    staveY,
                  });
                }
              }
            } catch {
              // Skip notes that can't be measured
            }
          }
        });
        
        // Draw continuous highlight boxes for each stave line with high visibility
        selectedNotesByLine.forEach(({ minX, maxX, staveY }) => {
          const highlightRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          
          // Use smaller padding to avoid bleeding into adjacent notes
          // Scale padding based on selection width - narrower selections get tighter padding
          const selectionWidth = maxX - minX;
          const padding = Math.min(4, selectionWidth * 0.1); // Max 4px, or 10% of width
          
          highlightRect.setAttribute('x', String(minX - padding));
          highlightRect.setAttribute('y', String(staveY + 15)); // Slightly lower to better frame notes
          highlightRect.setAttribute('width', String(selectionWidth + padding * 2));
          highlightRect.setAttribute('height', String(75)); // Slightly shorter
          highlightRect.setAttribute('fill', 'rgba(147, 51, 234, 0.15)'); // Slightly more subtle fill
          highlightRect.setAttribute('stroke', '#9333ea'); // Solid purple border
          highlightRect.setAttribute('stroke-width', '2');
          highlightRect.setAttribute('rx', '4');
          highlightRect.setAttribute('ry', '4');
          highlightRect.setAttribute('class', 'selection-highlight');
          highlightRect.setAttribute('pointer-events', 'none');
          
          // Insert at the beginning so it appears behind notes
          if (svgElement.firstChild) {
            svgElement.insertBefore(highlightRect, svgElement.firstChild);
          } else {
            svgElement.appendChild(highlightRect);
          }
        });
      }
      
      // Draw metronome dots if enabled
      if (metronomeEnabled) {
        // Get beat grouping for this time signature
        const beatGrouping = getDefaultBeatGrouping(rhythm.timeSignature);
        
        // Convert beat grouping to sixteenths
        const beatGroupingInSixteenths = getBeatGroupingInSixteenths(beatGrouping, rhythm.timeSignature);
        
        // Draw dots for ALL beat group positions, not just where notes exist
        rhythm.measures.forEach((_measure, measureIndex) => {
          // Find the stave for this measure
          const measureRefs = allStaveNoteRefs.filter(ref => ref.measureIndex === measureIndex);
          if (measureRefs.length === 0) return;
          
          // Sort by noteIndex to ensure correct order
          measureRefs.sort((a, b) => a.noteIndex - b.noteIndex);
          
          const stave = measureRefs[0].stave;
          
          // Calculate all beat group positions for this measure (in sixteenths)
          const beatPositions = [0]; // Start with downbeat
          let cumulativePosition = 0;
          const localSixteenthsPerMeasure = getSixteenthsPerMeasure(rhythm.timeSignature);
          beatGroupingInSixteenths.forEach((groupSize) => {
            cumulativePosition += groupSize;
            if (cumulativePosition < localSixteenthsPerMeasure) {
              beatPositions.push(cumulativePosition);
            }
          });
          
          // For each beat position, calculate X coordinate using note-based positioning
          // This ensures dots align with actual rendered notes regardless of measure length
          beatPositions.forEach((beatPosition) => {
            let dotX: number;
            
            // Find the note that contains this beat position
            let cumulativeNotePosition = 0;
            let found = false;
            
            for (let i = 0; i < measureRefs.length; i++) {
              const ref = measureRefs[i];
              const noteStartPosition = cumulativeNotePosition;
              const noteEndPosition = cumulativeNotePosition + ref.note.durationInSixteenths;
              
              // Check if this beat position falls within this note
              if (beatPosition >= noteStartPosition && beatPosition < noteEndPosition) {
                // Beat is within this note - calculate proportional X position
                const progressWithinNote = (beatPosition - noteStartPosition) / ref.note.durationInSixteenths;
                const noteX = ref.staveNote.getAbsoluteX();
                
                if (progressWithinNote === 0) {
                  // Beat is at the start of this note
                  dotX = noteX;
                } else {
                  // Beat is partway through this note - interpolate to next note
                  const nextX = i < measureRefs.length - 1 
                    ? measureRefs[i + 1].staveNote.getAbsoluteX()
                    : noteX + 40; // Estimate if no next note
                  dotX = noteX + (nextX - noteX) * progressWithinNote;
                }
                found = true;
                break;
              }
              
              cumulativeNotePosition = noteEndPosition;
            }
            
            // If beat position wasn't found within any note (shouldn't happen normally),
            // use the first note's X position as fallback
            if (!found) {
              dotX = measureRefs[0].staveNote.getAbsoluteX();
            }
            
            const dotY = stave.getYForLine(5) + 8; // Closer to the bottom of the staff
            
            // Create unique ID for this dot based on measure and position
            const dotId = `metronome-dot-${measureIndex}-${beatPosition}`;
            
            // Create new dot
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle') as SVGCircleElement;
            circle.setAttribute('id', dotId);
            circle.setAttribute('cx', dotX.toString());
            circle.setAttribute('cy', dotY.toString());
            circle.setAttribute('class', 'metronome-dot');
            circle.setAttribute('data-measure', measureIndex.toString());
            circle.setAttribute('data-position', beatPosition.toString());
            circle.setAttribute('r', '4'); // Smaller dots (was 5)
            circle.setAttribute('fill', '#6b7280'); // Dark grey - use setAttribute for SVG
            circle.setAttribute('stroke', 'none');
            circle.setAttribute('stroke-width', '0');
            if (svgElement) {
              svgElement.appendChild(circle);
            }
            
            // Store reference to this dot
            metronomeDotsRef.current.set(dotId, circle);
          });
        });
      }
    } catch (error) {
      console.error('Error rendering VexFlow notation:', error);
    }
            // Preview rendering is handled in a separate useEffect below
    // Note: notation, timeSignature, and onDropPattern are used for drag/drop but don't need to trigger re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rhythm, currentNote, metronomeEnabled, windowWidth, selection]);
  
  // Separate effect to update metronome dot highlighting
  useEffect(() => {
    if (!metronomeEnabled || metronomeDotsRef.current.size === 0) return;
    
    // Reset all dots to inactive state (dark grey)
    metronomeDotsRef.current.forEach((circle) => {
      circle.setAttribute('fill', '#6b7280'); // Use setAttribute instead of style for SVG
      circle.setAttribute('stroke', 'none');
      circle.setAttribute('stroke-width', '0');
    });
    
    // Highlight the current beat if it exists
    if (currentMetronomeBeat) {
      const { measureIndex, positionInSixteenths } = currentMetronomeBeat;
      
      // Find the dot at this position
      const dotId = `metronome-dot-${measureIndex}-${positionInSixteenths}`;
      const circle = metronomeDotsRef.current.get(dotId);
      
      if (circle) {
        circle.setAttribute('fill', '#ef4444'); // Red
        circle.setAttribute('stroke', '#dc2626');
        circle.setAttribute('stroke-width', '1');
      }
    }
  }, [currentMetronomeBeat, metronomeEnabled, rhythm.measures]);

  // Click-to-select functionality (desktop-style rectangle selection)
  // Using React event handlers on the container for reliability
  const handleContainerMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Left click only
    
    const container = containerRef.current;
    const svg = container?.querySelector('svg');
    if (!container || !svg) return;
    
    e.preventDefault();
    
    const state = dragStateRef.current;
    
    const clientToContainer = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      return {
        x: clientX - rect.left + container.scrollLeft,
        y: clientY - rect.top + container.scrollTop,
      };
    };
    
    const clientToSvg = (clientX: number, clientY: number) => {
      const rect = svg.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };
    
    const containerCoords = clientToContainer(e.clientX, e.clientY);
    const svgCoords = clientToSvg(e.clientX, e.clientY);
    
    // Find clicked note
    let clickedNote: NotePosition | null = null;
    for (const notePos of notePositionsRef.current) {
      const padding = 10;
      if (svgCoords.x >= notePos.x - padding && svgCoords.x <= notePos.x + notePos.width + padding &&
          svgCoords.y >= (notePos.staveY || notePos.y) - padding && 
          svgCoords.y <= (notePos.staveY || notePos.y) + 80 + padding) {
        clickedNote = notePos;
        break;
      }
    }
    
    // Check if clicking within existing selection (for drag-to-move)
    // Use tied group bounds if available
    const noteStart = clickedNote?.tiedGroupStart ?? clickedNote?.charPosition ?? 0;
    const noteEnd = clickedNote?.tiedGroupEnd ?? (clickedNote ? clickedNote.charPosition + clickedNote.durationInSixteenths : 0);
    
    if (clickedNote && selection && selection.startCharPosition !== null && selection.endCharPosition !== null &&
        noteStart >= selection.startCharPosition && 
        noteEnd <= selection.endCharPosition && onMoveSelection) {
      state.isDraggingSelection = true;
      state.startX = e.clientX;
      state.startY = e.clientY;
      state.hasDragged = false;
      return;
    }
    
    // Shift-click extends selection (expand to include tied groups)
    if (clickedNote && e.shiftKey && selection && selection.startCharPosition !== null) {
      const newStart = Math.min(selection.startCharPosition, noteStart);
      const newEnd = Math.max(selection.endCharPosition || selection.startCharPosition, noteEnd);
      if (onSelectionChange) {
        onSelectionChange(newStart, newEnd, newEnd - newStart);
      }
      return;
    }
    
    // Start rectangle selection
    state.isDrawing = true;
    state.startX = containerCoords.x;
    state.startY = containerCoords.y;
    state.startSvgX = svgCoords.x;
    state.startSvgY = svgCoords.y;
    state.hasDragged = false;
    
    // Clear previous selection
    if (onSelectionChange) {
      onSelectionChange(null, null, 0);
    }
  }, [selection, onSelectionChange, onMoveSelection]);

  // Global mouse move handler for rectangle drawing
  useEffect(() => {
    const state = dragStateRef.current;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!state.isDrawing && !state.isDraggingSelection) return;
      
      const container = containerRef.current;
      const svg = container?.querySelector('svg');
      if (!container || !svg) return;
      
      const clientToContainer = (clientX: number, clientY: number) => ({
        x: clientX - container.getBoundingClientRect().left + container.scrollLeft,
        y: clientY - container.getBoundingClientRect().top + container.scrollTop,
      });
      
      const clientToSvg = (clientX: number, clientY: number) => ({
        x: clientX - svg.getBoundingClientRect().left,
        y: clientY - svg.getBoundingClientRect().top,
      });
      
      // Handle selection move
      if (state.isDraggingSelection && !state.hasDragged) {
        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;
        if (Math.sqrt(dx * dx + dy * dy) > 5) {
          state.hasDragged = true;
          container.style.cursor = 'grabbing';
        }
      }
      
      if (state.isDraggingSelection && state.hasDragged) {
        // Show insertion preview using findDropTarget for consistent positioning
        const svgCoords = clientToSvg(e.clientX, e.clientY);
        svg.querySelectorAll('.drag-preview').forEach(el => el.remove());
        
        const dropTarget = findDropTarget(svgCoords.x, svgCoords.y, notePositionsRef.current);
        
        if (dropTarget && selection && selection.startCharPosition !== null && selection.endCharPosition !== null) {
          const exactPos = dropTarget.exactCharPosition;
          
          // Only show preview if target is outside the current selection
          if (exactPos < selection.startCharPosition || exactPos >= selection.endCharPosition) {
            const notePos = dropTarget.notePos;
            const staveY = notePos.staveY || notePos.y;
            
            // Calculate insertion line X based on exact position within the note
            const offsetWithinNote = exactPos - notePos.charPosition;
            const proportionWithinNote = offsetWithinNote / notePos.durationInSixteenths;
            const insertionX = notePos.x + (proportionWithinNote * notePos.width);
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', String(insertionX));
            line.setAttribute('y1', String(staveY + 15));
            line.setAttribute('x2', String(insertionX));
            line.setAttribute('y2', String(staveY + 95));
            line.setAttribute('stroke', '#9333ea');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-dasharray', '6,4');
            line.setAttribute('class', 'drag-preview');
            line.setAttribute('pointer-events', 'none');
            svg.appendChild(line);
          }
        }
        return;
      }
      
      // Handle rectangle drawing
      if (state.isDrawing) {
        state.hasDragged = true;
        
        const containerCoords = clientToContainer(e.clientX, e.clientY);
        const svgCoords = clientToSvg(e.clientX, e.clientY);
        
        // Update visual rectangle (direct DOM manipulation to avoid re-render conflicts)
        updateSelectionRect({
          startX: state.startX,
          startY: state.startY,
          currentX: containerCoords.x,
          currentY: containerCoords.y,
        });
        
        // Find notes in rectangle and update selection
        const minX = Math.min(state.startSvgX, svgCoords.x);
        const maxX = Math.max(state.startSvgX, svgCoords.x);
        const minY = Math.min(state.startSvgY, svgCoords.y);
        const maxY = Math.max(state.startSvgY, svgCoords.y);
        
        let startChar = Infinity;
        let endChar = -Infinity;
        
        notePositionsRef.current.forEach((notePos) => {
          const noteLeft = notePos.x;
          const noteRight = notePos.x + notePos.width;
          const noteTop = notePos.staveY || notePos.y;
          const noteBottom = noteTop + 80;
          
          if (noteRight >= minX && noteLeft <= maxX && noteBottom >= minY && noteTop <= maxY) {
            // If note is part of a tied group, expand to include the whole group
            if (notePos.tiedGroupStart !== undefined && notePos.tiedGroupEnd !== undefined) {
              startChar = Math.min(startChar, notePos.tiedGroupStart);
              endChar = Math.max(endChar, notePos.tiedGroupEnd);
            } else {
              startChar = Math.min(startChar, notePos.charPosition);
              endChar = Math.max(endChar, notePos.charPosition + notePos.durationInSixteenths);
            }
          }
        });
        
        if (startChar !== Infinity && endChar !== -Infinity && onSelectionChange) {
          onSelectionChange(startChar, endChar, endChar - startChar);
        }
      }
    };
    
    const handleGlobalMouseUp = (e: MouseEvent) => {
      const state = dragStateRef.current;
      const container = containerRef.current;
      const svg = container?.querySelector('svg');
      
      // Handle move completion
      if (state.isDraggingSelection && state.hasDragged && onMoveSelection && selection &&
          selection.startCharPosition !== null && selection.endCharPosition !== null && svg) {
        const svgRect = svg.getBoundingClientRect();
        const svgX = e.clientX - svgRect.left;
        const svgY = e.clientY - svgRect.top;
        
        // Use findDropTarget to get the exact position (same logic as regular drag-drop)
        const dropTarget = findDropTarget(svgX, svgY, notePositionsRef.current);
        
        if (dropTarget) {
          const targetPosition = dropTarget.exactCharPosition;
          
          // Only move if target is outside the current selection
          if (targetPosition < selection.startCharPosition || targetPosition >= selection.endCharPosition) {
            onMoveSelection(selection.startCharPosition, selection.endCharPosition, targetPosition);
          }
        }
        
        svg.querySelectorAll('.drag-preview').forEach(el => el.remove());
        if (container) container.style.cursor = '';
      }
      
      // Handle rectangle selection completion
      if (state.isDrawing) {
        updateSelectionRect(null); // Hide rectangle
        
        if (!state.hasDragged && svg) {
          // Single click - select note or clear
          const svgRect = svg.getBoundingClientRect();
          const svgX = e.clientX - svgRect.left;
          const svgY = e.clientY - svgRect.top;
          
          let clickedNote: NotePosition | null = null;
          for (const notePos of notePositionsRef.current) {
            if (svgX >= notePos.x - 10 && svgX <= notePos.x + notePos.width + 10 &&
                svgY >= (notePos.staveY || notePos.y) - 10 && svgY <= (notePos.staveY || notePos.y) + 90) {
              clickedNote = notePos;
              break;
            }
          }
          
          if (clickedNote && onSelectionChange) {
            // If clicking on a tied note, select the entire tied group
            const start = clickedNote.tiedGroupStart ?? clickedNote.charPosition;
            const end = clickedNote.tiedGroupEnd ?? (clickedNote.charPosition + clickedNote.durationInSixteenths);
            onSelectionChange(start, end, end - start);
          } else if (onSelectionChange) {
            onSelectionChange(null, null, 0);
          }
        }
      }
      
      // Reset state
      state.isDrawing = false;
      state.isDraggingSelection = false;
      state.hasDragged = false;
    };
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [selection, onSelectionChange, onMoveSelection, updateSelectionRect]);

  // React-style drag handlers - more reliable than manual SVG event listeners
  // These are always attached and handle events that bubble up from SVG elements
  const handleContainerDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!timeSignature || !notation || !containerRef.current || !onDropPattern) {
      return;
    }
    
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;
    
    // Clear any existing preview
    const existingPreview = svg.querySelectorAll('.preview-note');
    existingPreview.forEach(el => el.remove());
    
    const pattern = getCurrentDraggedPattern();
    const cleanNotation = notation.replace(/[\s\n]/g, '');
    
    // Compute drop preview
    const previewResult = computeDropPreview(
      e.clientX,
      e.clientY,
      pattern,
      cleanNotation,
      timeSignature,
      dragDropMode,
      notePositionsRef.current,
      containerRef
    );
    
    // Set dropEffect
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = previewResult.isValid ? 'copy' : 'none';
    }
    
    // Render preview
    if (previewResult.isValid) {
      if (previewResult.previewType === 'replace' && previewResult.replacementHighlights.length > 0) {
        previewResult.replacementHighlights.forEach((bounds) => {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', String(bounds.x));
          rect.setAttribute('y', String(bounds.y));
          rect.setAttribute('width', String(bounds.width));
          rect.setAttribute('height', String(bounds.height));
          rect.setAttribute('fill', 'rgba(239, 68, 68, 0.3)');
          rect.setAttribute('stroke', 'rgba(239, 68, 68, 0.8)');
          rect.setAttribute('stroke-width', '2');
          rect.setAttribute('stroke-dasharray', '4,4');
          rect.setAttribute('class', 'preview-note');
          rect.setAttribute('pointer-events', 'none');
          svg.appendChild(rect);
        });
      } else if (previewResult.previewType === 'insert' && previewResult.insertionLine) {
        const { x, top, bottom } = previewResult.insertionLine;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(x));
        line.setAttribute('y1', String(top));
        line.setAttribute('x2', String(x));
        line.setAttribute('y2', String(bottom));
        line.setAttribute('stroke', '#9333ea');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '6,4');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('class', 'preview-note');
        line.setAttribute('pointer-events', 'none');
        svg.appendChild(line);
      }
    }
  }, [notation, timeSignature, dragDropMode, onDropPattern]);
  
  const handleContainerDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Only clear preview if leaving the container entirely (not entering a child)
    const relatedTarget = e.relatedTarget as Node | null;
    if (relatedTarget && containerRef.current?.contains(relatedTarget)) {
      return; // Still within container, don't clear preview
    }
    
    if (containerRef.current) {
      const svg = containerRef.current.querySelector('svg');
      if (svg) {
        const existingPreview = svg.querySelectorAll('.preview-note');
        existingPreview.forEach(el => el.remove());
      }
    }
  }, []);
  
  const handleContainerDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear preview
    if (containerRef.current) {
      const svg = containerRef.current.querySelector('svg');
      if (svg) {
        svg.querySelectorAll('.preview-note').forEach(el => el.remove());
      }
    }
    
    if (!timeSignature || !notation || !onDropPattern) {
      return;
    }
    
    // Get pattern from dataTransfer or global variable
    let pattern: string | null = null;
    if (e.dataTransfer) {
      pattern = e.dataTransfer.getData('application/darbuka-pattern') || 
                e.dataTransfer.getData('text/plain');
    }
    if (!pattern) {
      pattern = getCurrentDraggedPattern();
    }
    
    if (!pattern) {
      return;
    }
    
    const cleanNotation = notation.replace(/[\s\n]/g, '');
    
    // Compute drop position using the same logic as preview
    const previewResult = computeDropPreview(
      e.clientX,
      e.clientY,
      pattern,
      cleanNotation,
      timeSignature,
      dragDropMode,
      notePositionsRef.current,
      containerRef
    );
    
    if (previewResult.isValid) {
      onDropPattern(pattern, previewResult.dropPosition);
    }
  }, [notation, timeSignature, dragDropMode, onDropPattern]);

  if (rhythm.measures.length === 0) {
    return null;
  }

  return (
    <div 
      ref={containerRef} 
      className="vexflow-container"
      onMouseDown={handleContainerMouseDown}
      onDragOver={handleContainerDragOver}
      onDragLeave={handleContainerDragLeave}
      onDrop={handleContainerDrop}
      style={{ 
        width: '100%', 
        overflowX: 'auto',
        padding: '20px 0',
        position: 'relative', // Enable absolute positioning for selection overlay
        cursor: 'crosshair',
      }}
    >
      {/* Selection rectangle overlay - always rendered, visibility controlled via ref */}
      <div
        ref={selectionRectRef}
        className="selection-rectangle-overlay"
        style={{
          display: 'none', // Initially hidden, controlled by updateSelectionRect
          position: 'absolute',
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          border: '1.5px solid rgba(59, 130, 246, 0.8)',
          borderRadius: '2px',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
    </div>
  );
};

export default VexFlowRenderer;
