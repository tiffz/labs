/**
 * Key transposition utilities
 * Transpose keys up or down by semitones
 */

import type { Key } from '../types';

/**
 * Maps keys to their semitone position (0-11)
 * Uses sharp notation as the primary representation
 */
const KEY_TO_SEMITONE: Record<Key, number> = {
  'C': 0,
  'C#': 1,
  'Db': 1,
  'D': 2,
  'D#': 3,
  'Eb': 3,
  'E': 4,
  'F': 5,
  'F#': 6,
  'Gb': 6,
  'G': 7,
  'G#': 8,
  'Ab': 8,
  'A': 9,
  'A#': 10,
  'Bb': 10,
  'B': 11,
};

/**
 * Maps semitone positions (0-11) to preferred key names
 * Prefers sharps for most keys, but uses flats where conventional (Bb, Eb, Ab, Db, Gb)
 */
const SEMITONE_TO_KEY: Record<number, Key[]> = {
  0: ['C'],
  1: ['C#', 'Db'],
  2: ['D'],
  3: ['D#', 'Eb'],
  4: ['E'],
  5: ['F'],
  6: ['F#', 'Gb'],
  7: ['G'],
  8: ['G#', 'Ab'],
  9: ['A'],
  10: ['A#', 'Bb'],
  11: ['B'],
};

/**
 * Get the preferred key name for a semitone position
 * Prefers the key that matches common usage (sharps for most, flats for Bb, Eb, Ab, Db, Gb)
 */
function getPreferredKey(semitone: number, currentKey: Key): Key {
  const options = SEMITONE_TO_KEY[semitone];
  if (!options || options.length === 0) {
    return currentKey; // Fallback
  }
  
  // If only one option, use it
  if (options.length === 1) {
    return options[0];
  }
  
  // Prefer flats for: Bb, Eb, Ab, Db, Gb
  const flatKeys: Key[] = ['Bb', 'Eb', 'Ab', 'Db', 'Gb'];
  if (flatKeys.includes(currentKey) && options.includes(currentKey)) {
    return currentKey; // Keep using flat if already using it
  }
  
  // Otherwise prefer sharp
  return options[0];
}

/**
 * Transpose a key up or down by a number of semitones
 * @param key - The current key
 * @param semitones - Number of semitones to transpose (positive = up, negative = down)
 * @returns The transposed key
 */
export function transposeKey(key: Key, semitones: number): Key {
  const currentSemitone = KEY_TO_SEMITONE[key];
  let newSemitone = (currentSemitone + semitones) % 12;
  
  // Handle negative modulo
  if (newSemitone < 0) {
    newSemitone += 12;
  }
  
  return getPreferredKey(newSemitone, key);
}

/**
 * Transpose a key up by one semitone
 */
export function transposeKeyUp(key: Key): Key {
  return transposeKey(key, 1);
}

/**
 * Transpose a key down by one semitone
 */
export function transposeKeyDown(key: Key): Key {
  return transposeKey(key, -1);
}

