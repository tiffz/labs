import React, { useEffect, useRef, useState } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Beam, Dot, BarlineType } from 'vexflow';
import type { ParsedRhythm, Note, DrumSound, TimeSignature } from '../types';
import { drawDrumSymbol } from '../assets/drumSymbols';
import { getDefaultBeatGrouping, isCompoundTimeSignature, isAsymmetricTimeSignature, getBeatGroupingInSixteenths, getSixteenthsPerMeasure } from '../utils/timeSignatureUtils';
import type { NotePosition } from '../utils/dropTargetFinder';
import { computeDropPreview } from '../utils/dropPreview';
import { getCurrentDraggedPattern } from './NotePalette';

interface VexFlowRendererProps {
  rhythm: ParsedRhythm;
  currentNote?: { measureIndex: number; noteIndex: number } | null;
  metronomeEnabled?: boolean;
  currentMetronomeBeat?: { measureIndex: number; positionInSixteenths: number; isDownbeat: boolean } | null;
  onDropPattern?: (pattern: string, charPosition: number) => void;
  dragDropMode?: 'replace' | 'insert';
  notation?: string;
  timeSignature?: TimeSignature;
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
  // Canvas drags render preview directly in drag handlers for immediate feedback
  // All preview rendering uses unified computeDropPreview system
  const svgHandlersRef = useRef<{ handleDragOver: (e: DragEvent) => void; handleDragLeave: () => void; handleDrop: (e: DragEvent) => void } | null>(null);

  // Re-render on window resize to recalculate responsive layout
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
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
      const calculateMeasureWidth = (measure: typeof rhythm.measures[0]): number => {
        const baseWidth = 120; // Base width for time signature, barlines, etc.
        const widthPerNote = 25; // Width allocated per note (reduced from 35)
        const minWidth = 200;
        const maxWidth = 850; // Reduced max to prevent horizontal scroll
        
        const calculatedWidth = baseWidth + (measure.notes.length * widthPerNote);
        return Math.max(minWidth, Math.min(maxWidth, calculatedWidth));
      };

      const measureWidths = rhythm.measures.map(calculateMeasureWidth);
      
      // Layout measures into lines based on available width
      // Use viewport width minus padding for responsive layout
      const containerPadding = 40; // Account for margins and padding
      const sidebarWidth = 280; // Approximate sidebar width
      const maxLineWidth = Math.max(600, Math.min(1200, windowWidth - sidebarWidth - containerPadding));
      const lineHeight = 100;
      const leftMargin = 10;
      const rightMargin = 10;
      
      // Group measures into lines
      const lines: number[][] = []; // Array of arrays of measure indices
      let currentLine: number[] = [];
      let currentLineWidth = leftMargin;
      
      rhythm.measures.forEach((_measure, measureIndex) => {
        const measureWidth = measureWidths[measureIndex];
        
        // Check if adding this measure would exceed the line width
        if (currentLine.length > 0 && currentLineWidth + measureWidth + rightMargin > maxLineWidth) {
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
      
      const numLines = lines.length;
      // Add extra space at bottom for metronome dots (15px)
      const totalHeight = numLines * lineHeight + 40 + (metronomeEnabled ? 15 : 0);
      const totalWidth = maxLineWidth + 20;

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
          });

          // Ensure stems are visible for all notes (except whole notes and rests)
            // Use stems up for standard notation
          if (!isRest && duration !== 'w' && duration !== 'wd') {
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
            
            // Workaround for VexFlow bug: manually draw stems that weren't rendered
            staveNotes.forEach((note) => {
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
        
        rhythm.measures.forEach((_measure, measureIndex) => {
          const measureRefs = allStaveNoteRefsRef.current
            .filter(ref => ref.measureIndex === measureIndex)
            .sort((a, b) => a.noteIndex - b.noteIndex); // Ensure correct order
          
          measureRefs.forEach((ref) => {
            try {
              const bounds = ref.staveNote.getBoundingBox();
              if (bounds) {
                const noteX = bounds.getX();
                const noteYRelativeToStave = bounds.getY();
                const noteWidth = bounds.getW();
                const noteHeight = bounds.getH();
                
                // Get absolute Y position: note Y relative to stave + stave Y position
                const staveY = ref.stave.getY();
                const noteY = noteYRelativeToStave + staveY;
                
                // Calculate character length: duration in sixteenths = number of characters
                // For example: D--- = 4 chars (duration 4), ____ = 4 chars (duration 4)
                notePositionsRef.current.push({
                  measureIndex: ref.measureIndex,
                  noteIndex: ref.noteIndex,
                  x: noteX,
                  y: noteY, // Absolute Y position relative to SVG
                  width: noteWidth,
                  height: noteHeight,
                  charPosition: charPosition,
                  durationInSixteenths: ref.note.durationInSixteenths,
                  staveY: staveY, // Store stave Y position for accurate highlight calculation
                });
                
                // Move to next note's position - durationInSixteenths equals character length
                charPosition += ref.note.durationInSixteenths;
              }
            } catch (error) {
              console.log('Error getting bounds for note after rendering:', ref.measureIndex, ref.noteIndex, error);
            }
          });
        });
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
          
          const stave = measureRefs[0].stave;
          
          // Calculate all beat group positions for this measure (in sixteenths)
          const beatPositions = [0]; // Start with downbeat
          let cumulativePosition = 0;
          const sixteenthsPerMeasure = getSixteenthsPerMeasure(rhythm.timeSignature);
          beatGroupingInSixteenths.forEach((groupSize) => {
            cumulativePosition += groupSize;
            if (cumulativePosition < sixteenthsPerMeasure) {
              beatPositions.push(cumulativePosition);
            }
          });
          
          // Get stave dimensions
          const staveX = stave.getX();
          const staveWidth = stave.getWidth();
          
          // For each beat position, find the exact X coordinate
          beatPositions.forEach((beatPosition) => {
            // Find the note at or immediately after this beat position
            let cumulativeNotePosition = 0;
            let dotX = staveX + 30; // Default to start of measure
            
            // Find the note that contains or follows this beat position
            for (let i = 0; i < measureRefs.length; i++) {
              const ref = measureRefs[i];
              
              // If we've reached or passed the beat position, use this note's X position
              if (cumulativeNotePosition >= beatPosition) {
                dotX = ref.staveNote.getAbsoluteX();
                break;
              }
              
              cumulativeNotePosition += ref.note.durationInSixteenths;
              
              // If the beat position falls within this note's duration, interpolate
              if (cumulativeNotePosition > beatPosition) {
                const prevPosition = cumulativeNotePosition - ref.note.durationInSixteenths;
                const progress = (beatPosition - prevPosition) / ref.note.durationInSixteenths;
                const noteX = ref.staveNote.getAbsoluteX();
                const nextX = i < measureRefs.length - 1 
                  ? measureRefs[i + 1].staveNote.getAbsoluteX()
                  : staveX + staveWidth - 30;
                dotX = noteX + (nextX - noteX) * progress;
                break;
              }
            }
            
            const dotY = stave.getYForLine(5) + 8; // Closer to the bottom of the staff
            
            // Adjust X position slightly to the right to align with visual beat start
            dotX += 5;
            
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
  }, [rhythm, currentNote, metronomeEnabled, windowWidth]);
  
  // Old preview rendering functions removed - now using unified computeDropPreview system
  // All preview rendering happens directly in handleSvgDragOver using computeDropPreview

  // Add drop handlers to SVG element to ensure drops work even when dragging over SVG
  useEffect(() => {
    if (!containerRef.current || !onDropPattern) {
      return;
    }
    
    const attachSvgHandlers = (svg: SVGElement) => {
        // Remove old handlers if they exist
        if (svgHandlersRef.current) {
          svg.removeEventListener('dragover', svgHandlersRef.current.handleDragOver);
          svg.removeEventListener('dragleave', svgHandlersRef.current.handleDragLeave);
          svg.removeEventListener('drop', svgHandlersRef.current.handleDrop);
        }
    
      const handleSvgDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Get current values from refs/state to avoid stale closures
        const currentNotation = notation;
        const currentTimeSignature = timeSignature;
        const currentDragDropMode = dragDropMode;
        
        if (!currentTimeSignature || !currentNotation || !containerRef.current) {
          return;
        }
        
        const svg = containerRef.current.querySelector('svg');
        if (!svg) return;
        
        // Clear any existing preview immediately
        const existingPreview = svg.querySelectorAll('.preview-note');
        existingPreview.forEach(el => el.remove());
        
        const pattern = getCurrentDraggedPattern();
        
        // CRITICAL: Use SINGLE unified function to compute drop preview state
        // This ensures perfect consistency between dropEffect and visual preview
        const previewResult = computeDropPreview(
          e.clientX,
          e.clientY,
          pattern,
          currentNotation,
          currentTimeSignature,
          currentDragDropMode,
          notePositionsRef.current,
          containerRef
        );
        
        // Set dropEffect based on unified computation
        // This is the ONLY place where dropEffect is set
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = previewResult.isValid ? 'copy' : 'none';
        }
        
        // Render preview based on unified computation
        // This is the ONLY place where preview is rendered
        if (previewResult.isValid) {
          if (previewResult.previewType === 'replace') {
            // Render replacement highlights
            if (previewResult.replacementHighlights.length > 0) {
              previewResult.replacementHighlights.forEach((bounds) => {
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', String(bounds.x));
                rect.setAttribute('y', String(bounds.y));
                rect.setAttribute('width', String(bounds.width));
                rect.setAttribute('height', String(bounds.height));
                rect.setAttribute('fill', 'rgba(239, 68, 68, 0.3)'); // Red fill
                rect.setAttribute('stroke', 'rgba(239, 68, 68, 0.8)'); // Red stroke
                rect.setAttribute('stroke-width', '2');
                rect.setAttribute('stroke-dasharray', '4,4');
                rect.setAttribute('class', 'preview-note');
                rect.setAttribute('pointer-events', 'none');
                svg.appendChild(rect);
              });
            }
          } else if (previewResult.previewType === 'insert' && previewResult.insertionLine) {
            // Render insertion line - sleek modern dashed line
            const { x, top, bottom } = previewResult.insertionLine;
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', String(x));
            line.setAttribute('y1', String(top));
            line.setAttribute('x2', String(x));
            line.setAttribute('y2', String(bottom));
            line.setAttribute('stroke', '#9333ea'); // Purple
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-dasharray', '6,4'); // Modern dashed pattern with bigger gaps
            line.setAttribute('stroke-linecap', 'round');
            line.setAttribute('class', 'preview-note');
            line.setAttribute('pointer-events', 'none');
            
            svg.appendChild(line);
          }
        }
      };
      
      const handleSvgDragLeave = () => {
        // Clear preview immediately
        if (containerRef.current) {
          const svg = containerRef.current.querySelector('svg');
          if (svg) {
            const existingPreview = svg.querySelectorAll('.preview-note');
            existingPreview.forEach(el => el.remove());
          }
        }
      };
    
      const handleSvgDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Get current values from refs/state to avoid stale closures
        const currentNotation = notation;
        const currentTimeSignature = timeSignature;
        
        // Try to get pattern from dataTransfer first, then global variable
        let pattern: string | null = null;
        if (e.dataTransfer) {
          pattern = e.dataTransfer.getData('application/darbuka-pattern') || 
                    e.dataTransfer.getData('text/plain');
        }
        
        // Fallback to global variable
        if (!pattern) {
          pattern = getCurrentDraggedPattern();
        }
        
        if (!pattern || !currentTimeSignature) {
          return;
        }
        
        // CRITICAL: Use the SAME unified function as preview
        // This ensures drop position matches preview exactly
        const previewResult = computeDropPreview(
          e.clientX,
          e.clientY,
          pattern,
          currentNotation,
          currentTimeSignature,
          dragDropMode,
          notePositionsRef.current,
          containerRef
        );
        
        if (!previewResult.isValid) {
          return; // Can't drop if preview says it's invalid
        }
        
        // Clear preview before dropping
        if (containerRef.current) {
          const svg = containerRef.current.querySelector('svg');
          if (svg) {
            const existingPreview = svg.querySelectorAll('.preview-note');
            existingPreview.forEach(el => el.remove());
          }
        }
        
        // Use dropPosition from unified computation
        // This ensures perfect consistency with preview
        onDropPattern(pattern, previewResult.dropPosition);
      };
      
      svg.addEventListener('dragover', handleSvgDragOver);
      svg.addEventListener('dragleave', handleSvgDragLeave);
      svg.addEventListener('drop', handleSvgDrop);
      
      // Store handlers in ref for cleanup
      svgHandlersRef.current = { 
        handleDragOver: handleSvgDragOver, 
        handleDrop: handleSvgDrop,
        handleDragLeave: handleSvgDragLeave,
      };
    };
    
    // Wait for SVG to be rendered and positions to be tracked
    // Re-attach handlers whenever the SVG is re-rendered (e.g., on resize)
    const attachHandlers = () => {
      const svg = containerRef.current?.querySelector('svg');
      if (!svg) {
        return;
      }
      
      // If positions aren't tracked yet, wait a bit more
      if (notePositionsRef.current.length === 0) {
        setTimeout(attachHandlers, 100);
        return;
      }
      
      attachSvgHandlers(svg);
    };
    
    // Initial attachment
    const timeoutId = setTimeout(attachHandlers, 100);
    
    // Also re-attach after a delay to catch resize cases
    const retryTimeoutId = setTimeout(attachHandlers, 500);
    
    // Capture ref value for cleanup
    const container = containerRef.current;
    const handlers = svgHandlersRef.current;
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(retryTimeoutId);
      // Clean up handlers if they were attached
      const svg = container?.querySelector('svg');
      if (svg && handlers) {
        svg.removeEventListener('dragover', handlers.handleDragOver);
        svg.removeEventListener('dragleave', handlers.handleDragLeave);
        svg.removeEventListener('drop', handlers.handleDrop);
        svgHandlersRef.current = null;
      }
    };
  }, [onDropPattern, notation, timeSignature, dragDropMode, rhythm, windowWidth, metronomeEnabled]);

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

  // Removed old React drag handlers - drag and drop is now handled by SVG event handlers
  // (handleSvgDragOver, handleSvgDrop, etc.) which use the unified preview system

  // Visual feedback effect - highlight notes that would be replaced
  // Removed old drag-over highlight system - now using unified preview system
  // The preview is rendered in the main useEffect above using renderInsertionLine() and renderPreviewNotes()

  if (rhythm.measures.length === 0) {
    return null;
  }

  return (
    <div 
      ref={containerRef} 
      className="vexflow-container"
      style={{ 
        width: '100%', 
        overflowX: 'auto',
        padding: '20px 0',
      }}
    />
  );
};

export default VexFlowRenderer;
