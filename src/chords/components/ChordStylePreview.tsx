/**
 * Visual preview component for chord styling strategies
 * Shows a single measure preview of what the chord style looks like in C major
 */

import React, { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Dot, Beam, Fraction } from 'vexflow';
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
    // VexFlow requires 'r' suffix in duration string to indicate rest
    const restDuration = duration.includes('r') ? duration : duration + 'r';
    return new StaveNote({
      keys: [restPitch],
      duration: restDuration,
      clef: clef,
    });
  }
  
  const pitches = notes.map(midiToPitch);
  
  // Check if this is a dotted note (duration contains 'd' but not 'r' for rest)
  const isDotted = duration.includes('d') && !duration.includes('r');
  
  const staveNote = new StaveNote({
    keys: pitches,
    duration: duration,
    clef: clef,
    autoStem: false,
  });
  
  const normalizedDuration = duration.replace('r', '').replace('d', '');
  const isWholeNote = normalizedDuration === 'w';
  const isLikelyBeamed = normalizedDuration === '8' || normalizedDuration === '16';
  if (!isWholeNote && !isLikelyBeamed) {
    staveNote.setStemDirection(clef === 'treble' ? 1 : -1);
  }

  // Add dot for dotted notes
  if (isDotted) {
    Dot.buildAndAttach([staveNote], { all: true });
  }
  
  return staveNote;
}

const ChordStylePreview: React.FC<ChordStylePreviewProps> = ({
  strategy,
  timeSignature,
  width = 140, // Balanced width to fit in sidebar without overflow
  height = 80,
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

      // Create renderer - smaller scale for denser preview
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(width, height);
      const context = renderer.getContext();
      
      // Use smaller scale for denser, more compact preview
      // Adjust scale based on number of notes to ensure everything fits
      const totalNotes = styledChord.trebleNotes.length + styledChord.bassNotes.length;
      const scale = totalNotes > 6 ? 0.45 : 0.5; // Even smaller scale for complex patterns
      context.scale(scale, scale);

      // Create grand staff (scaled coordinates)
      // Minimal top spacing, but more space between treble and bass staves for readability
      const trebleY = -2; // Negative Y to minimize top whitespace
      const bassY = trebleY + 65; // Spacing between staves
      const scaledWidth = width / scale;

      // Calculate stave width - make it wider to accommodate all notes
      const barlineWidth = 10;
      const staveWidth = scaledWidth; // Use full scaled width

      const trebleStave = new Stave(0, trebleY, staveWidth);
      trebleStave.addClef('treble');
      trebleStave.addTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
      trebleStave.setContext(context).draw();

      const bassStave = new Stave(0, bassY, staveWidth);
      bassStave.addClef('bass');
      bassStave.addTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
      bassStave.setContext(context).draw();

      // Create notes for entire measure
      const trebleNotes = styledChord.trebleNotes.map(group =>
        notesToStaveNote(group.notes, group.duration, 'treble')
      );
      const bassNotes = styledChord.bassNotes.map(group =>
        notesToStaveNote(group.notes, group.duration, 'bass')
      );

      // Create voices for entire measure
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
      // Format both voices together to ensure proper alignment
      const formatter = new Formatter();
      formatter.joinVoices([trebleVoice, bassVoice]);
      
      // Calculate format width more aggressively to fit all notes
      // Use VexFlow's getNoteStartX() to get the actual start position after clef/time sig
      const noteStartX = trebleStave.getNoteStartX();
      const staveEndX = staveWidth;
      const formatWidth = staveEndX - noteStartX - barlineWidth - 3; // Minimal right padding
      
      // Ensure format width is reasonable (at least 40px)
      const finalFormatWidth = Math.max(formatWidth, 40);
      formatter.format([trebleVoice, bassVoice], finalFormatWidth);

      // Add beams for eighth notes based on time signature
      const addBeams = (notes: StaveNote[], clef: 'treble' | 'bass') => {
        const beamGroup =
          timeSignature.denominator === 8
            ? new Fraction(3, 8)
            : new Fraction(1, 4);
        const beams = Beam.generateBeams(notes, {
          groups: [beamGroup],
          beamRests: false,
          maintainStemDirections: false,
        });
        const groupStemDirection = clef === 'treble' ? 1 : -1;
        beams.forEach((beam) => {
          beam.getNotes().forEach((note) => {
            (note as StaveNote).setStemDirection(groupStemDirection);
          });
        });
        return beams;
      };
      
      const trebleBeams = addBeams(trebleNotes, 'treble');
      const bassBeams = addBeams(bassNotes, 'bass');

      const suppressFlagsForBeamedNotes = (beams: Beam[]) => {
        const beamedNotes = new Set<StaveNote>();
        beams.forEach((beam) => {
          beam.getNotes().forEach((note) => {
            beamedNotes.add(note as StaveNote);
          });
        });
        beamedNotes.forEach((note) => {
          note.setFlagStyle({ fillStyle: 'transparent', strokeStyle: 'transparent' });
        });
      };

      suppressFlagsForBeamedNotes(trebleBeams);
      suppressFlagsForBeamedNotes(bassBeams);
      
      // Draw both voices to show complete measure
      trebleVoice.draw(context, trebleStave);
      bassVoice.draw(context, bassStave);
      
      // Draw beams after notes are drawn
      trebleBeams.forEach(beam => beam.setContext(context).draw());
      bassBeams.forEach(beam => beam.setContext(context).draw());

      if (strategy === 'one-per-beat' && timeSignature.numerator === 12 && timeSignature.denominator === 8) {
        containerRef.current
          ?.querySelectorAll('.vf-flag, [class*="vf-flag"]')
          .forEach((node) => node.remove());
      }
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
        marginTop: '-6px', // More negative margin to reduce top whitespace
      }}
    />
  );
};

export default ChordStylePreview;

