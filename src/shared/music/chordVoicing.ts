/**
 * Chord voicing utilities shared across chord-driven apps.
 */

import type { Chord, VoicingOptions } from './chordTypes';

function getChordNotes(chord: Chord, clef: 'bass' | 'treble' = 'treble'): number[] {
  const { root, quality } = chord;
  const rootMap: Record<string, number> = {
    C: 60,
    'C#': 61,
    Db: 61,
    D: 62,
    'D#': 63,
    Eb: 63,
    E: 64,
    F: 65,
    'F#': 66,
    Gb: 66,
    G: 67,
    'G#': 68,
    Ab: 68,
    A: 69,
    'A#': 70,
    Bb: 70,
    B: 71,
  };

  const rootMidi = rootMap[root] || 60;
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
  let baseOctave = rootMidi;

  if (clef === 'bass') {
    if (rootMidi >= 60) baseOctave = rootMidi - 12;
  } else if (rootMidi < 60) {
    baseOctave = rootMidi + 12;
  }

  let notes = chordIntervals.map((interval) => baseOctave + interval);
  const minNote = clef === 'bass' ? 40 : 60;
  const maxNote = clef === 'bass' ? 62 : 84;
  const lowestNote = Math.min(...notes);
  const highestNote = Math.max(...notes);

  if (highestNote > maxNote) {
    const octavesDown = Math.ceil((highestNote - maxNote) / 12);
    notes = notes.map((n) => n - octavesDown * 12);
  } else if (lowestNote < minNote) {
    const octavesUp = Math.ceil((minNote - lowestNote) / 12);
    notes = notes.map((n) => n + octavesUp * 12);
  }

  notes = notes.map((note) => {
    let adjusted = note;
    while (adjusted < minNote) adjusted += 12;
    while (adjusted > maxNote) adjusted -= 12;
    return adjusted;
  });

  return notes;
}

function applyInversion(notes: number[], inversion: number): number[] {
  if (inversion === 0) return notes;
  const inverted = [...notes];
  for (let i = 0; i < inversion; i += 1) {
    const bottomNote = inverted.shift();
    if (bottomNote !== undefined) inverted.push(bottomNote + 12);
  }
  return inverted;
}

function toOpenVoicing(notes: number[]): number[] {
  if (notes.length < 3) return notes;
  const [root, third, fifth] = notes;
  const otherNotes = notes.slice(3);
  return [root, fifth, third + 12, ...otherNotes.map((n) => n + 12)];
}

function randomizeOctaves(notes: number[], clef: 'bass' | 'treble' = 'treble'): number[] {
  const minNote = clef === 'bass' ? 40 : 60;
  const maxNote = clef === 'bass' ? 62 : 84;

  return notes.map((note) => {
    const octaveShift = Math.floor(Math.random() * 3) - 1;
    let next = note + octaveShift * 12;
    if (next < minNote) next = minNote;
    if (next > maxNote) next = maxNote;
    return next;
  });
}

export function generateVoicing(
  chord: Chord,
  options: VoicingOptions,
  clef: 'bass' | 'treble' = 'treble'
): number[] {
  let notes = getChordNotes(chord, clef);

  if (clef === 'bass') {
    const rootMap: Record<string, number> = {
      C: 60,
      'C#': 61,
      Db: 61,
      D: 62,
      'D#': 63,
      Eb: 63,
      E: 64,
      F: 65,
      'F#': 66,
      Gb: 66,
      G: 67,
      'G#': 68,
      Ab: 68,
      A: 69,
      'A#': 70,
      Bb: 70,
      B: 71,
    };
    const requestedBass = chord.bassRoot ? rootMap[chord.bassRoot] : undefined;
    const bassNote = requestedBass ?? notes[0];
    const minBass = 40;
    const maxBass = 62;
    let clamped = bassNote;
    while (clamped < minBass) clamped += 12;
    while (clamped > maxBass) clamped -= 12;
    return [clamped];
  }

  if (options.useInversions && chord.inversion !== undefined) {
    notes = applyInversion(notes, chord.inversion);
  }
  if (options.useOpenVoicings) {
    notes = toOpenVoicing(notes);
  }
  if (options.randomizeOctaves) {
    notes = randomizeOctaves(notes, clef);
  }

  const minTreble = 60;
  const maxTreble = 84;
  const lowest = Math.min(...notes);
  const highest = Math.max(...notes);

  if (highest > maxTreble) {
    const octavesDown = Math.ceil((highest - maxTreble) / 12);
    notes = notes.map((n) => n - octavesDown * 12);
  } else if (lowest < minTreble) {
    const octavesUp = Math.ceil((minTreble - lowest) / 12);
    notes = notes.map((n) => n + octavesUp * 12);
  }

  notes = notes.map((note) => {
    let adjusted = note;
    while (adjusted < minTreble) adjusted += 12;
    while (adjusted > maxTreble) adjusted -= 12;
    return adjusted;
  });

  return notes.sort((a, b) => a - b);
}
