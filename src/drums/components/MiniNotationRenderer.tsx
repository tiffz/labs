import React, { useEffect, useRef, useMemo } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Dot, BarlineType } from 'vexflow';
import type { DrumSound } from '../types';

interface MiniNotationRendererProps {
  pattern: string;
  width?: number;
  height?: number;
  /** If true, show compact repeat notation (% for repeated measures) */
  showCompactRepeats?: boolean;
}

/**
 * Maps Darbuka sounds to F line position (F/4)
 */
const SOUND_TO_PITCH: Record<DrumSound, string> = {
  dum: 'f/4',
  tak: 'f/4',
  ka: 'f/4',
  slap: 'f/4',
  rest: 'f/4',
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
      path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M 6 -7 Q -2 -7, -2 0 Q -2 7, 6 7 L 6 13');
      path.setAttribute('stroke', 'black');
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      symbolGroup.appendChild(path);
      break;

    case 'tak':
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
      path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M -6 -6 L 0 6 L 6 -6');
      path.setAttribute('stroke', 'black');
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'miter');
      symbolGroup.appendChild(path);
      break;

    case 'slap': {
      // Slap is a filled circle - slightly wider (radius 7.5)
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '0');
      circle.setAttribute('cy', '0');
      circle.setAttribute('r', '7.5');
      circle.setAttribute('fill', 'black');
      circle.setAttribute('stroke', 'none');
      symbolGroup.appendChild(circle);
      break;
    }

    default:
      return;
  }

  svg.appendChild(symbolGroup);
};

/**
 * Parse a simple pattern into notes
 */
const parsePattern = (pattern: string): Array<{ sound: DrumSound; duration: number; isDotted: boolean }> => {
  const notes: Array<{ sound: DrumSound; duration: number; isDotted: boolean }> = [];
  let i = 0;
  
  const NOTATION_MAP: Record<string, DrumSound> = {
    'D': 'dum', 'd': 'dum',
    'T': 'tak', 't': 'tak',
    'K': 'ka', 'k': 'ka',
    'S': 'slap', 's': 'slap',
    '.': 'rest',
  };
  
  while (i < pattern.length) {
    const char = pattern[i];
    
    if (NOTATION_MAP[char]) {
      const sound = NOTATION_MAP[char];
      let duration = 1;
      
      // Count consecutive dashes
      let j = i + 1;
      while (j < pattern.length && pattern[j] === '-') {
        duration++;
        j++;
      }
      
      // Check for dotted note indicator
      const isDotted = j < pattern.length && pattern[j] === '.';
      if (isDotted) j++;
      
      notes.push({ sound, duration, isDotted });
      i = j;
    } else {
      i++;
    }
  }
  
  return notes;
};

/**
 * Detects consecutive identical measures in a pattern and returns compact notation info.
 * A "measure" in this context is 16 sixteenths worth of notes.
 */
const detectRepeatedMeasures = (pattern: string): { uniquePattern: string; repeatCount: number } => {
  // Split by spaces to get measures
  const measures = pattern.split(/\s+/).filter(m => m.trim().length > 0);
  
  if (measures.length <= 1) {
    return { uniquePattern: pattern, repeatCount: 1 };
  }
  
  // Check if all measures are identical
  const firstMeasure = measures[0];
  const allIdentical = measures.every(m => m === firstMeasure);
  
  if (allIdentical) {
    return { uniquePattern: firstMeasure, repeatCount: measures.length };
  }
  
  return { uniquePattern: pattern, repeatCount: 1 };
};

const MiniNotationRenderer: React.FC<MiniNotationRendererProps> = ({ 
  pattern,
  width = 120,
  height = 80,
  showCompactRepeats = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect repeated measures for compact display
  const { uniquePattern, repeatCount } = useMemo(() => {
    if (!showCompactRepeats) {
      return { uniquePattern: pattern, repeatCount: 1 };
    }
    return detectRepeatedMeasures(pattern);
  }, [pattern, showCompactRepeats]);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    try {
      const notes = parsePattern(uniquePattern);
      if (notes.length === 0) {
        return;
      }

      // Render at a larger size, then scale down with CSS for better quality
      const renderScale = 1.5;
      const renderWidth = width * renderScale;
      const renderHeight = height * renderScale;
      
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(renderWidth, renderHeight);
      const context = renderer.getContext();

      // Calculate width - narrower if showing repeats to make room for simile
      const staveWidth = repeatCount > 1 ? renderWidth - 60 : renderWidth - 40;
      
      // Create a single stave without time signature
      const stave = new Stave(15, 35, staveWidth, { numLines: 1 });
      
      // Add repeat barlines if this pattern repeats
      if (repeatCount > 1) {
        stave.setBegBarType(BarlineType.REPEAT_BEGIN);
        stave.setEndBarType(BarlineType.REPEAT_END);
      }
      
      stave.setContext(context).draw();

      // Convert to VexFlow notes
      const staveNotes = notes.map(note => {
        let durationType = 'q';
        if (note.duration === 1) durationType = '16';
        else if (note.duration === 2) durationType = '8';
        else if (note.duration >= 4 && note.duration < 8) durationType = 'q';
        else if (note.duration >= 8 && note.duration < 16) durationType = 'h';
        else if (note.duration >= 16) durationType = 'w';

        if (note.isDotted) durationType += 'd';
        
        const isRest = note.sound === 'rest';
        if (isRest) durationType += 'r';

        const staveNote = new StaveNote({
          keys: [SOUND_TO_PITCH[note.sound]],
          duration: durationType,
          clef: 'percussion',
        });

        if (!isRest && durationType !== 'w' && durationType !== 'wd') {
          staveNote.setStemDirection(1);
        }

        if (note.isDotted) {
          Dot.buildAndAttach([staveNote], { all: true });
        }

        return staveNote;
      });

      // Format and draw notes using Voice (required for proper formatting)
      if (staveNotes.length > 0) {
        // Create a voice with flexible timing (we don't care about exact measure length)
        const voice = new Voice({ numBeats: 4, beatValue: 4 });
        voice.setStrict(false);
        voice.addTickables(staveNotes);

        // Format the notes
        new Formatter()
          .joinVoices([voice])
          .format([voice], staveWidth - 25);

        // Draw the voice
        voice.draw(context, stave);
      }

      // Draw custom symbols
      const svgElement = containerRef.current?.querySelector('svg');
      if (svgElement) {
        staveNotes.forEach((staveNote, noteIndex) => {
          const note = notes[noteIndex];
          if (note && note.sound !== 'rest') {
            const noteX = staveNote.getAbsoluteX() + 10;
            const noteY = stave.getYForLine(0);
            drawSymbolAboveNote(svgElement, noteX, noteY, note.sound);
          }
        });
        
        // Draw repeat count if applicable
        if (repeatCount > 1) {
          const repeatText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          repeatText.setAttribute('x', String(staveWidth + 25));
          repeatText.setAttribute('y', String(55));
          repeatText.setAttribute('font-family', 'Arial, sans-serif');
          repeatText.setAttribute('font-size', '14');
          repeatText.setAttribute('font-weight', 'bold');
          repeatText.setAttribute('fill', '#666');
          repeatText.textContent = `×${repeatCount}`;
          svgElement.appendChild(repeatText);
        }
      }
    } catch (error) {
      console.error('Error rendering mini notation for pattern:', uniquePattern, error);
    }
  }, [uniquePattern, width, height, repeatCount]);

  return (
    <div 
      className="mini-notation-renderer"
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        ref={containerRef}
        style={{
          transform: 'scale(0.67)',
          transformOrigin: 'top left',
          width: `${width * 1.5}px`,
          height: `${height * 1.5}px`,
        }}
      />
    </div>
  );
};

export default MiniNotationRenderer;

