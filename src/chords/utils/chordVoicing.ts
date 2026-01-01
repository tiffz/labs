/**
 * Chord voicing utilities for generating different chord voicings
 */

import type { Chord, VoicingOptions } from '../types';

/**
 * Gets the notes in a chord based on root and quality
 * Returns MIDI note numbers
 * Constrains notes to reasonable ranges to minimize ledger lines:
 * - Treble clef: C4 (60) to C6 (84) - comfortable range within staff
 * - Bass clef: C2 (36) to C4 (60) - comfortable range within staff
 */
function getChordNotes(chord: Chord, clef: 'bass' | 'treble' = 'treble'): number[] {
  const { root, quality } = chord;
  
  // Map root note to MIDI number (default to C4 = 60)
  const rootMap: Record<string, number> = {
    'C': 60, 'C#': 61, 'Db': 61, 'D': 62, 'D#': 63, 'Eb': 63,
    'E': 64, 'F': 65, 'F#': 66, 'Gb': 66, 'G': 67, 'G#': 68,
    'Ab': 68, 'A': 69, 'A#': 70, 'Bb': 70, 'B': 71,
  };
  
  const rootMidi = rootMap[root] || 60;
  
  // Define intervals for each chord quality (in semitones from root)
  const intervals: Record<string, number[]> = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    diminished: [0, 3, 6],
    augmented: [0, 4, 8],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    dominant7: [0, 4, 7, 10],
    major7: [0, 4, 7, 11],
    minor7: [0, 3, 7, 10],
  };
  
  const chordIntervals = intervals[quality] || intervals.major;
  
  // Determine target octave based on clef
  let baseOctave = rootMidi;
  if (clef === 'bass') {
    // For bass clef, use C3-C4 range (48-60) as starting point
    // If root is C4 or above, move down an octave
    if (rootMidi >= 60) {
      baseOctave = rootMidi - 12;
    }
  } else {
    // For treble clef, use C4-C5 range (60-72) as starting point
    // If root is below C4, move up an octave
    if (rootMidi < 60) {
      baseOctave = rootMidi + 12;
    }
  }
  
  // Generate notes from intervals
  let notes = chordIntervals.map(interval => baseOctave + interval);
  
  // Constrain notes to reasonable ranges to minimize ledger lines
  // Use tighter ranges for better readability
  const minNote = clef === 'bass' ? 36 : 60; // C2 for bass, C4 for treble
  const maxNote = clef === 'bass' ? 60 : 79; // C4 for bass, G5 for treble (tighter upper bound)
  
  // Find the range of notes
  const lowestNote = Math.min(...notes);
  const highestNote = Math.max(...notes);
  
  // If the entire chord is out of range, move it as a unit
  if (highestNote > maxNote) {
    // Calculate how many octaves to move down
    const octavesDown = Math.ceil((highestNote - maxNote) / 12);
    notes = notes.map(n => n - (octavesDown * 12));
  } else if (lowestNote < minNote) {
    // Calculate how many octaves to move up
    const octavesUp = Math.ceil((minNote - lowestNote) / 12);
    notes = notes.map(n => n + (octavesUp * 12));
  }
  
  // Final safety clamp - ensure no individual note is outside range
  notes = notes.map(note => {
    while (note < minNote) {
      note += 12;
    }
    while (note > maxNote) {
      note -= 12;
    }
    return note;
  });
  
  return notes;
}

/**
 * Applies inversions to chord notes
 */
function applyInversion(notes: number[], inversion: number): number[] {
  if (inversion === 0) return notes;
  
  const inverted = [...notes];
  for (let i = 0; i < inversion; i++) {
    const bottomNote = inverted.shift();
    if (bottomNote !== undefined) {
      inverted.push(bottomNote + 12); // Move bottom note up an octave
    }
  }
  return inverted;
}

/**
 * Converts closed voicing to open voicing
 * Open voicing spreads notes across wider intervals
 */
function toOpenVoicing(notes: number[]): number[] {
  if (notes.length < 3) return notes;
  
  const [root, third, fifth] = notes;
  const otherNotes = notes.slice(3);
  
  // Move the third up an octave for open voicing
  return [root, fifth, third + 12, ...otherNotes.map(n => n + 12)];
}

/**
 * Randomizes octaves within a reasonable range
 * Constrains notes to prevent excessive ledger lines
 */
function randomizeOctaves(notes: number[], clef: 'bass' | 'treble' = 'treble'): number[] {
  const minNote = clef === 'bass' ? 36 : 60; // C2 for bass, C4 for treble
  const maxNote = clef === 'bass' ? 60 : 84; // C4 for bass, C6 for treble
  
  return notes.map((note) => {
    // Randomize each note's octave independently, but constrain to range
    const octaveShift = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1 octave
    let newNote = note + (octaveShift * 12);
    
    // Clamp to reasonable range
    if (newNote < minNote) {
      newNote = minNote;
    } else if (newNote > maxNote) {
      newNote = maxNote;
    }
    
    return newNote;
  });
}

/**
 * Generates a voicing for a chord based on options
 * @param chord - The chord to voice
 * @param options - Voicing options
 * @param clef - Which clef this is for ('bass' for bass note, 'treble' for chord)
 */
export function generateVoicing(chord: Chord, options: VoicingOptions, clef: 'bass' | 'treble' = 'treble'): number[] {
  let notes = getChordNotes(chord, clef);
  
  // For bass clef, we typically just want the root note
  if (clef === 'bass') {
    return [notes[0]]; // Just return the root note
  }
  
  // Apply inversion if enabled (treble only)
  if (options.useInversions && chord.inversion !== undefined) {
    notes = applyInversion(notes, chord.inversion);
  }
  
  // Convert to open voicing if enabled (treble only)
  if (options.useOpenVoicings) {
    notes = toOpenVoicing(notes);
  }
  
  // Randomize octaves if enabled (treble only)
  if (options.randomizeOctaves) {
    notes = randomizeOctaves(notes, clef);
  }
  
  // Final constraint check - ensure all notes are within reasonable range
  // This is critical to prevent excessive ledger lines
  // Use tighter ranges for better readability
  const minNote = clef === 'bass' ? 36 : 60; // C2 for bass, C4 for treble
  const maxNote = clef === 'bass' ? 60 : 79; // C4 for bass, G5 for treble (tighter upper bound)
  
  // Find the range of notes after all transformations
  const lowestNote = Math.min(...notes);
  const highestNote = Math.max(...notes);
  
  // If the entire chord is out of range, move it as a unit
  if (highestNote > maxNote) {
    // Calculate how many octaves to move down
    const octavesDown = Math.ceil((highestNote - maxNote) / 12);
    notes = notes.map(n => n - (octavesDown * 12));
  } else if (lowestNote < minNote) {
    // Calculate how many octaves to move up
    const octavesUp = Math.ceil((minNote - lowestNote) / 12);
    notes = notes.map(n => n + (octavesUp * 12));
  }
  
  // Final safety clamp - ensure no individual note is outside range
  notes = notes.map(note => {
    while (note < minNote) {
      note += 12;
    }
    while (note > maxNote) {
      note -= 12;
    }
    return note;
  });
  
  return notes.sort((a, b) => a - b); // Sort notes from low to high
}

