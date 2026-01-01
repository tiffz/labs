/**
 * Key signature utilities for VexFlow rendering
 */

import type { Key } from '../types';

/**
 * Maps keys to their key signature (number of sharps/flats)
 * Returns: { type: 'sharp' | 'flat', count: number }
 */
export function getKeySignature(key: Key): { type: 'sharp' | 'flat'; count: number } {
  const keySignatures: Record<Key, { type: 'sharp' | 'flat'; count: number }> = {
    'C': { type: 'sharp', count: 0 },
    'G': { type: 'sharp', count: 1 },
    'D': { type: 'sharp', count: 2 },
    'A': { type: 'sharp', count: 3 },
    'E': { type: 'sharp', count: 4 },
    'B': { type: 'sharp', count: 5 },
    'F#': { type: 'sharp', count: 6 },
    'C#': { type: 'sharp', count: 7 },
    'F': { type: 'flat', count: 1 },
    'Bb': { type: 'flat', count: 2 },
    'Eb': { type: 'flat', count: 3 },
    'Ab': { type: 'flat', count: 4 },
    'Db': { type: 'flat', count: 5 },
    'Gb': { type: 'flat', count: 6 },
    'Cb': { type: 'flat', count: 7 },
    // Enharmonic equivalents
    'D#': { type: 'sharp', count: 6 }, // Same as Eb but prefer sharps
    'G#': { type: 'sharp', count: 8 }, // Same as Ab but prefer sharps
    'A#': { type: 'sharp', count: 4 }, // Same as Bb but prefer sharps
  };
  
  return keySignatures[key] || { type: 'sharp', count: 0 };
}

