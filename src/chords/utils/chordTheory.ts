/**
 * Chord theory utilities for converting Roman numerals to actual chords
 */

import type { Key, RomanNumeral, Chord, ChordQuality } from '../types';

/**
 * Maps Roman numerals to scale degrees (0-indexed)
 * Uppercase = major, lowercase = minor
 */
const ROMAN_TO_DEGREE: Record<RomanNumeral, number> = {
  'I': 0, 'II': 1, 'III': 2, 'IV': 3, 'V': 4, 'VI': 5, 'VII': 6,
  'i': 0, 'ii': 1, 'iii': 2, 'iv': 3, 'v': 4, 'vi': 5, 'vii': 6,
};

/**
 * Determines chord quality from Roman numeral
 */
function getChordQuality(roman: RomanNumeral): ChordQuality {
  if (roman === roman.toUpperCase()) {
    // Uppercase = major (except VII which is diminished in major keys)
    if (roman === 'VII') return 'diminished';
    return 'major';
  } else {
    // Lowercase = minor
    return 'minor';
  }
}

/**
 * Chromatic scale starting from C
 */
const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Major scale intervals (semitones from root)
 */
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

/**
 * Minor scale intervals (natural minor - semitones from root)
 */
const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

/**
 * Converts a key string to its chromatic index
 */
function keyToChromaticIndex(key: Key): number {
  // Handle enharmonic equivalents
  const keyMap: Record<Key, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
    'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
  };
  return keyMap[key];
}

/**
 * Determines if a key is major or minor based on the first chord
 * For now, we'll assume major keys (can be enhanced later)
 */
function isMajorKey(): boolean {
  // For now, assume all keys are major
  // This can be enhanced to detect minor keys based on context
  return true;
}

/**
 * Converts a Roman numeral to an actual chord in a given key
 */
export function romanNumeralToChord(roman: RomanNumeral, key: Key): Chord {
  const degree = ROMAN_TO_DEGREE[roman];
  const quality = getChordQuality(roman);
  const keyIndex = keyToChromaticIndex(key);
  const isMajor = isMajorKey();
  
  // Get scale intervals based on key type
  const scaleIntervals = isMajor ? MAJOR_SCALE_INTERVALS : MINOR_SCALE_INTERVALS;
  
  // Calculate the root note of the chord
  const scaleDegreeSemitones = scaleIntervals[degree];
  const rootChromaticIndex = (keyIndex + scaleDegreeSemitones) % 12;
  const rootNote = CHROMATIC_SCALE[rootChromaticIndex];
  
  return {
    root: rootNote,
    quality,
    inversion: 0, // Default to root position
    octave: 4, // Default octave
  };
}

/**
 * Converts a chord progression (Roman numerals) to actual chords
 */
export function progressionToChords(progression: RomanNumeral[], key: Key): Chord[] {
  return progression.map(roman => romanNumeralToChord(roman, key));
}

