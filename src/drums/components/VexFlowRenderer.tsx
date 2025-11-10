import React, { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Beam, Dot } from 'vexflow';
import type { ParsedRhythm, Note, DrumSound } from '../types';

interface VexFlowRendererProps {
  rhythm: ParsedRhythm;
}

/**
 * Maps Darbuka sounds to F line position (F/4)
 * All notes on the F line for standard percussion notation placement
 */
const SOUND_TO_PITCH: Record<DrumSound, string> = {
  dum: 'f/4',
  tak: 'f/4',
  ka: 'f/4',
  rest: 'f/4',
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
 * Draw custom SVG symbol above a note
 */
const drawSymbolAboveNote = (
  svg: SVGSVGElement,
  x: number,
  y: number,
  sound: DrumSound
): void => {
  const symbolGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  symbolGroup.setAttribute('transform', `translate(${x}, ${y - 25})`);

  let path: SVGPathElement;

  switch (sound) {
    case 'dum':
      // Backwards question mark shape - C with integrated vertical line
      // Centered at x=0, matching tak and ka alignment
      path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      // Draw a smooth curve that flows from the C into a vertical line
      path.setAttribute('d', 'M 6 -7 Q -2 -7, -2 0 Q -2 7, 6 7 L 6 13');
      path.setAttribute('stroke', 'black');
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      symbolGroup.appendChild(path);
      break;

    case 'tak':
      // Upward caret ^ - sharp angle, centered above note
      path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M -6 6 L 0 -6 L 6 6');
      path.setAttribute('stroke', 'black');
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'miter');
      symbolGroup.appendChild(path);
      break;

    case 'ka':
      // Downward V - sharp angle, centered above note
      path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M -6 -6 L 0 6 L 6 -6');
      path.setAttribute('stroke', 'black');
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'miter');
      symbolGroup.appendChild(path);
      break;

    default:
      return;
  }

  svg.appendChild(symbolGroup);
};

const VexFlowRenderer: React.FC<VexFlowRendererProps> = ({ rhythm }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || rhythm.measures.length === 0) {
      return;
    }

    // Clear previous rendering
    containerRef.current.innerHTML = '';

    try {
      const containerWidth = containerRef.current.clientWidth || 800;
      const measureWidth = Math.max(300, Math.min(400, containerWidth / rhythm.measures.length));
      const totalWidth = measureWidth * rhythm.measures.length + 100;
      const height = 200;

      // Create SVG renderer
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(totalWidth, height);
      const context = renderer.getContext();

      let xPosition = 10;

      rhythm.measures.forEach((measure, measureIndex) => {
        // Create a stave for each measure with only 1 line
        const stave = new Stave(xPosition, 40, measureWidth, { num_lines: 1 });

        // Add time signature to first measure only (no clef needed for single line)
        if (measureIndex === 0) {
          stave.addTimeSignature(`${rhythm.timeSignature.numerator}/${rhythm.timeSignature.denominator}`);
        }

        stave.setContext(context).draw();

        // Convert measure notes to VexFlow StaveNotes
        const staveNotes = measure.notes.map((note: Note) => {
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
          if (!isRest && duration !== 'w' && duration !== 'wd') {
            staveNote.setStemDirection(1); // 1 = up, -1 = down
          }

          // Explicitly add dot modifier for dotted notes to ensure it's visible
          if (note.isDotted) {
            Dot.buildAndAttach([staveNote], { all: true });
          }

          return staveNote;
        });

        if (staveNotes.length > 0) {
          // Create a voice and add the notes
          const beatsPerMeasure = rhythm.timeSignature.numerator;
          const beatValue = rhythm.timeSignature.denominator;
          
          const voice = new Voice({
            num_beats: beatsPerMeasure,
            beat_value: beatValue,
          });
          
          voice.setStrict(false); // Allow incomplete measures
          voice.addTickables(staveNotes);

          // Auto-beam eighth notes and sixteenth notes
          const beams = Beam.generateBeams(staveNotes, {
            beam_rests: false,
            beam_middle_only: true,
          });

          // Format and draw
          new Formatter()
            .joinVoices([voice])
            .format([voice], measureWidth - 20);

          voice.draw(context, stave);
          
          // Draw beams
          beams.forEach(beam => beam.setContext(context).draw());

          // Draw custom symbols above notes
          const svgElement = containerRef.current?.querySelector('svg');
          if (svgElement) {
            staveNotes.forEach((staveNote, noteIndex) => {
              const note = measure.notes[noteIndex];
              if (note && note.sound !== 'rest') {
                // Get the note's x position
                // VexFlow's note head width is approximately 10-12 pixels for quarter notes
                // We'll use a fixed offset to center the symbol over the note head
                const noteX = staveNote.getAbsoluteX() + 10; // Add offset to center over note head
                const noteY = stave.getYForLine(0); // Get Y position of the single staff line
                
                // Draw custom symbol
                drawSymbolAboveNote(svgElement, noteX, noteY, note.sound);
              }
            });
          }
        }

        xPosition += measureWidth;
      });
    } catch (error) {
      console.error('Error rendering VexFlow notation:', error);
    }
  }, [rhythm]);

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
