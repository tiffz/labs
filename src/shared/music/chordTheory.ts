/**
 * Shared chord theory helpers used by multiple music apps.
 */

import type { Chord, ChordQuality, Key, RomanNumeral } from './chordTypes';
import { NOTE_TO_PITCH_CLASS, SHARP_CHROMATIC } from './theory/pitchClass';

export type HarmonicMode = 'major' | 'minor';

const ROMAN_TO_DEGREE: Record<RomanNumeral, number> = {
  I: 0,
  II: 1,
  III: 2,
  IV: 3,
  V: 4,
  VI: 5,
  VII: 6,
  i: 0,
  ii: 1,
  iii: 2,
  iv: 3,
  v: 4,
  vi: 5,
  vii: 6,
};

const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11] as const;
const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10] as const;

function getChordQuality(roman: RomanNumeral): ChordQuality {
  if (roman === roman.toUpperCase()) {
    if (roman === 'VII') return 'diminished';
    return 'major';
  }
  return 'minor';
}

function keyToChromaticIndex(key: Key): number {
  return NOTE_TO_PITCH_CLASS[key] ?? 0;
}

export function romanNumeralToChord(
  roman: RomanNumeral,
  key: Key,
  mode: HarmonicMode = 'major'
): Chord {
  const degree = ROMAN_TO_DEGREE[roman];
  const quality = getChordQuality(roman);
  const keyIndex = keyToChromaticIndex(key);
  const scaleIntervals =
    mode === 'major' ? MAJOR_SCALE_INTERVALS : MINOR_SCALE_INTERVALS;
  const rootChromaticIndex = (keyIndex + scaleIntervals[degree]) % 12;
  const rootNote = SHARP_CHROMATIC[rootChromaticIndex] ?? 'C';

  return {
    root: rootNote,
    quality,
    inversion: 0,
    octave: 4,
  };
}

export function progressionToChords(
  progression: RomanNumeral[],
  key: Key,
  mode: HarmonicMode = 'major'
): Chord[] {
  return progression.map((roman) => romanNumeralToChord(roman, key, mode));
}
