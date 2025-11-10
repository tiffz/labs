import React, { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Beam, Dot } from 'vexflow';
import type { ParsedRhythm, Note, DrumSound } from '../types';
import { drawDrumSymbol } from '../assets/drumSymbols';

interface VexFlowRendererProps {
  rhythm: ParsedRhythm;
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
      const measureWidth = 350; // Fixed width per measure for consistency
      const measuresPerLine = Math.max(2, Math.floor((containerWidth - 20) / measureWidth)); // Minimum 2 measures per line
      const numLines = Math.ceil(rhythm.measures.length / measuresPerLine);
      const lineHeight = 140; // Reduced from 200 for tighter vertical spacing
      const totalHeight = numLines * lineHeight + 40;
      const totalWidth = Math.min(containerWidth, measureWidth * measuresPerLine + 20);

      // Create SVG renderer
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(totalWidth, totalHeight);
      const context = renderer.getContext();

      rhythm.measures.forEach((measure, measureIndex) => {
        const lineIndex = Math.floor(measureIndex / measuresPerLine);
        const positionInLine = measureIndex % measuresPerLine;
        const xPosition = 10 + positionInLine * measureWidth;
        const yPosition = 40 + lineIndex * lineHeight;
        
        // Create a stave for each measure with 5 lines (standard staff)
        const stave = new Stave(xPosition, yPosition, measureWidth, { numLines: 5 });

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
          // Use stems down so staff line appears at bottom
          if (!isRest && duration !== 'w' && duration !== 'wd') {
            staveNote.setStemDirection(-1); // -1 = down (staff line appears at bottom)
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
            numBeats: beatsPerMeasure,
            beatValue: beatValue,
          });
          
          voice.setStrict(false); // Allow incomplete measures
          voice.addTickables(staveNotes);

          // Auto-beam eighth notes and sixteenth notes BEFORE formatting
          const beams = Beam.generateBeams(staveNotes, {
            beamRests: false,
            beamMiddleOnly: false, // Beam all beamable notes
          });

          // Format and draw
          new Formatter()
            .joinVoices([voice])
            .format([voice], measureWidth - 20);

          voice.draw(context, stave);
          
          // Draw beams after voice
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
                const noteY = stave.getYForLine(2); // Get Y position of the middle (3rd) staff line
                
                // Draw custom drum symbol using shared utility
                drawDrumSymbol(svgElement, noteX, noteY, note.sound);
              }
            });
          }
        }
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
