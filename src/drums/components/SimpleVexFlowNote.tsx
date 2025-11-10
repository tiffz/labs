import React, { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Dot, Beam } from 'vexflow';
import { parsePatternToNotes, durationToVexFlow, isDottedDuration } from '../utils/notationHelpers';
import { drawDrumSymbol } from '../assets/drumSymbols';

interface SimpleVexFlowNoteProps {
  pattern: string;
  width?: number;
  height?: number;
}

/**
 * Simple VexFlow renderer for palette buttons
 * Uses shared notation parsing and symbol drawing utilities
 */
const SimpleVexFlowNote: React.FC<SimpleVexFlowNoteProps> = ({ 
  pattern,
  width = 100,
  height = 60,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    try {
      const notes = parsePatternToNotes(pattern);
      if (notes.length === 0) return;

      // Render at 2x size, then scale down with CSS for better visibility
      const renderScale = 2;
      const renderWidth = width * renderScale;
      const renderHeight = (height + 30) * renderScale; // Extra height to prevent cutoff
      
      // Create renderer at larger size
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(renderWidth, renderHeight);
      const context = renderer.getContext();

      // Simple stave - adjust width based on number of notes for better centering
      // Single notes get narrower staves, patterns get more space
      const noteCount = notes.length;
      const baseWidth = noteCount === 1 ? renderWidth - 60 : renderWidth - 50;
      const staveX = noteCount === 1 ? 25 : 20;
      const staveWidth = Math.max(baseWidth, 80);
      const stave = new Stave(staveX, 50, staveWidth, { numLines: 5 });
      stave.setContext(context).draw();

      // Convert to VexFlow notes using shared utility
      const staveNotes = notes.map(note => {
        let durationType = durationToVexFlow(note.duration);
        const isRest = note.sound === 'rest';
        if (isRest) durationType += 'r';

        const staveNote = new StaveNote({
          keys: [isRest ? 'b/4' : 'f/4'], // Center rests, notes on F line
          duration: durationType,
          clef: 'percussion',
          autoStem: true, // Let VexFlow handle stems automatically
        });

        if (!isRest && !durationType.startsWith('h') && !durationType.startsWith('w')) {
          staveNote.setStemDirection(1); // Stems up for palette display
        }

        if (isDottedDuration(note.duration)) {
          Dot.buildAndAttach([staveNote], { all: true });
        }

        return staveNote;
      });

      // Create voice and format
      const voice = new Voice({ numBeats: 4, beatValue: 4 });
      voice.setStrict(false);
      voice.addTickables(staveNotes);

      // Auto-beam eighth and sixteenth notes BEFORE formatting
      const beams = Beam.generateBeams(staveNotes, {
        beamRests: false,
        beamMiddleOnly: false, // Beam all beamable notes
      });

      // Adjust formatting width based on note count for better centering
      const formatWidth = noteCount === 1 ? staveWidth - 15 : staveWidth - 25;
      new Formatter()
        .joinVoices([voice])
        .format([voice], formatWidth);

      voice.draw(context, stave);
      
      // Draw beams after voice
      beams.forEach(beam => beam.setContext(context).draw());

      // Draw custom drum symbols using shared utility
      const svgElement = containerRef.current?.querySelector('svg');
      if (svgElement) {
        staveNotes.forEach((staveNote, noteIndex) => {
          const note = notes[noteIndex];
          if (note && note.sound !== 'rest') {
            const noteX = staveNote.getAbsoluteX() + 10;
            const noteY = stave.getYForLine(2); // Middle line of 5-line staff
            drawDrumSymbol(svgElement, noteX, noteY, note.sound);
          }
        });
      }
    } catch (error) {
      console.error('Error rendering VexFlow note:', error);
    }
  }, [pattern, width, height]);

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        overflow: 'visible', // Don't clip the notes
      }}
    />
  );
};

export default SimpleVexFlowNote;

