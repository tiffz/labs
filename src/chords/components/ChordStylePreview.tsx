/**
 * Visual preview component for chord styling strategies
 * Shows a single measure preview of what the chord style looks like in C major
 */

import React, { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter } from 'vexflow';
import type { ChordStylingStrategy, TimeSignature } from '../types';
import { generateStyledChordNotes } from '../utils/chordStyling';
import { generateVoicing } from '../utils/chordVoicing';
import type { Chord } from '../types';

interface ChordStylePreviewProps {
  strategy: ChordStylingStrategy;
  timeSignature: TimeSignature;
  width?: number;
  height?: number;
}

/**
 * Converts MIDI note number to VexFlow pitch string
 */
function midiToPitch(midiNote: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}/${octave}`;
}

/**
 * Converts chord notes to VexFlow StaveNote
 */
function notesToStaveNote(notes: number[], duration: string, clef: 'bass' | 'treble'): StaveNote {
  if (notes.length === 0) {
    const restPitch = clef === 'bass' ? 'b/3' : 'b/4';
    return new StaveNote({
      keys: [restPitch],
      duration: duration,
      clef: clef,
    });
  }
  
  const pitches = notes.map(midiToPitch);
  return new StaveNote({
    keys: pitches,
    duration: duration,
    clef: clef,
  });
}

const ChordStylePreview: React.FC<ChordStylePreviewProps> = ({
  strategy,
  timeSignature,
  width = 120,
  height = 75,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    try {
      // Create a C major chord for preview
      const previewChord: Chord = {
        root: 'C',
        quality: 'major',
      };

      // Generate voicings
      const trebleVoicing = generateVoicing(previewChord, {
        useInversions: false,
        useOpenVoicings: false,
        randomizeOctaves: false,
      }, 'treble');
      const bassVoicing = generateVoicing(previewChord, {
        useInversions: false,
        useOpenVoicings: false,
        randomizeOctaves: false,
      }, 'bass');

      // Generate styled chord notes
      const styledChord = generateStyledChordNotes(
        previewChord,
        trebleVoicing,
        bassVoicing,
        strategy,
        timeSignature
      );

      // Create renderer - use larger size for better readability
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(width, height);
      const context = renderer.getContext();
      
      // Use a more readable scale - larger for better visibility
      const scale = 0.7;
      context.scale(scale, scale);

      // Create grand staff (scaled coordinates)
      // Add proper spacing between staves to prevent overlap
      const trebleY = 10;
      const bassY = trebleY + 60; // Increased spacing for grand staff
      const scaledWidth = width / scale;
      const scaledHeight = height / scale;

      const trebleStave = new Stave(0, trebleY, scaledWidth);
      trebleStave.addClef('treble');
      trebleStave.addTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
      trebleStave.setContext(context).draw();

      const bassStave = new Stave(0, bassY, scaledWidth);
      bassStave.addClef('bass');
      bassStave.addTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
      bassStave.setContext(context).draw();
      
      // Ensure we don't exceed the scaled height
      if (bassY + 20 > scaledHeight) {
        // If bass stave would overflow, adjust
        console.warn('Preview height may be too small for grand staff');
      }

      // Create notes
      const trebleNotes = styledChord.trebleNotes.map(group =>
        notesToStaveNote(group.notes, group.duration, 'treble')
      );
      const bassNotes = styledChord.bassNotes.map(group =>
        notesToStaveNote(group.notes, group.duration, 'bass')
      );

      // Create voices
      const trebleVoice = new Voice({
        numBeats: timeSignature.numerator,
        beatValue: timeSignature.denominator,
      });
      trebleVoice.setStrict(true);
      trebleVoice.addTickables(trebleNotes);

      const bassVoice = new Voice({
        numBeats: timeSignature.numerator,
        beatValue: timeSignature.denominator,
      });
      bassVoice.setStrict(true);
      bassVoice.addTickables(bassNotes);

      // Format and draw (scaled width)
      // Use proper formatting width to ensure notes fit within measure
      const formatter = new Formatter();
      formatter.joinVoices([trebleVoice, bassVoice]);
      // Use a conservative format width to ensure notes don't overflow
      const formatWidth = scaledWidth - 50; // More conservative padding for readability
      formatter.format([trebleVoice, bassVoice], formatWidth);

      trebleVoice.draw(context, trebleStave);
      bassVoice.draw(context, bassStave);
    } catch (error) {
      console.error('Error rendering chord style preview:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = '<div style="padding: 0.5rem; color: #999; font-size: 0.75rem;">Preview unavailable</div>';
      }
    }
  }, [strategy, timeSignature, width, height]);

  return (
    <div
      ref={containerRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        overflow: 'hidden',
      }}
    />
  );
};

export default ChordStylePreview;

