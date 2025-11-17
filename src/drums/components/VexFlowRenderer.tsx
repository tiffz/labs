import React, { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Beam, Dot, BarlineType } from 'vexflow';
import type { ParsedRhythm, Note, DrumSound } from '../types';
import { drawDrumSymbol } from '../assets/drumSymbols';
import { getDefaultBeatGrouping, isCompoundTimeSignature, isAsymmetricTimeSignature } from '../utils/timeSignatureUtils';

interface VexFlowRendererProps {
  rhythm: ParsedRhythm;
  currentNote?: { measureIndex: number; noteIndex: number } | null;
  metronomeEnabled?: boolean;
  currentMetronomeBeat?: { measureIndex: number; positionInSixteenths: number; isDownbeat: boolean } | null;
}

/**
 * Maps Darbuka sounds to staff positions
 * Notes on F/4 line, rests centered on B/4 (middle line)
 */
const SOUND_TO_PITCH: Record<DrumSound, string> = {
  dum: 'f/4',
  tak: 'f/4',
  ka: 'f/4',
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
  timeSignature: typeof import('../types').TimeSignature
): Beam[] {
  const beams: Beam[] = [];
  
  // Get beat grouping for this time signature
  const beatGrouping = getDefaultBeatGrouping(timeSignature);
  
  // Convert beat grouping to sixteenths
  // For /8 time: each beat group value is in eighth notes, so multiply by 2 to get sixteenths
  // For /4 time: each beat group value is already in sixteenths (from getDefaultBeatGrouping)
  const beatGroupingInSixteenths = timeSignature.denominator === 8
    ? beatGrouping.map(g => g * 2)  // Convert eighth notes to sixteenths
    : beatGrouping;  // Already in sixteenths
  
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
  currentMetronomeBeat = null
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const metronomeDotsRef = useRef<Map<string, SVGCircleElement>>(new Map());

  useEffect(() => {
    if (!containerRef.current || rhythm.measures.length === 0) {
      return;
    }

    // Clear previous rendering
    containerRef.current.innerHTML = '';
    metronomeDotsRef.current.clear();

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
      const maxLineWidth = 1200; // Maximum width before wrapping to next line
      const lineHeight = 100;
      const leftMargin = 10;
      const rightMargin = 10;
      
      // Group measures into lines
      const lines: number[][] = []; // Array of arrays of measure indices
      let currentLine: number[] = [];
      let currentLineWidth = leftMargin;
      
      rhythm.measures.forEach((measure, measureIndex) => {
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
            allStaveNoteRefs.push({
              staveNote,
              stave,
              measureIndex,
              noteIndex,
              note,
            });

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
                    
                    // After drawing, try to initialize stem extents if they're missing
                    try {
                      const extents = stem.getExtents();
                      if (!extents) {
                        // Force recalculation by calling the stem's internal methods
                        stem.setYBounds(stem.getYTop(), stem.getYBottom());
                      }
                    } catch {
                      // Couldn't initialize extents
                    }
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
        const beatGroupingInSixteenths = rhythm.timeSignature.denominator === 8
          ? beatGrouping.map(g => g * 2)
          : beatGrouping;
        
        // Draw dots for ALL beat group positions, not just where notes exist
        rhythm.measures.forEach((measure, measureIndex) => {
          // Find the stave for this measure
          const measureRefs = allStaveNoteRefs.filter(ref => ref.measureIndex === measureIndex);
          if (measureRefs.length === 0) return;
          
          const stave = measureRefs[0].stave;
          
          // Calculate all beat group positions for this measure (in sixteenths)
          const beatPositions = [0]; // Start with downbeat
          let cumulativePosition = 0;
          beatGroupingInSixteenths.forEach((groupSize) => {
            cumulativePosition += groupSize;
            const sixteenthsPerMeasure = rhythm.timeSignature.numerator * (rhythm.timeSignature.denominator === 8 ? 2 : 4);
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
            svgElement.appendChild(circle);
            
            // Store reference to this dot
            metronomeDotsRef.current.set(dotId, circle);
          });
        });
      }
    } catch (error) {
      console.error('Error rendering VexFlow notation:', error);
    }
  }, [rhythm, currentNote, metronomeEnabled]);

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
