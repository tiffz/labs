/**
 * Randomization utilities for chord progression generation
 */

import type { Key, TimeSignature, ChordProgressionConfig, ChordStylingStrategy } from '../types';
import { COMMON_CHORD_PROGRESSIONS } from '../data/chordProgressions';
import { CHORD_STYLING_STRATEGIES } from '../data/chordStylingStrategies';

export const ALL_KEYS: Key[] = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'
];

// Common time signatures weighted by popularity in pop music
const TIME_SIGNATURES: Array<{ timeSignature: TimeSignature; weight: number }> = [
  { timeSignature: { numerator: 4, denominator: 4 }, weight: 60 }, // Most common
  { timeSignature: { numerator: 3, denominator: 4 }, weight: 15 },
  { timeSignature: { numerator: 2, denominator: 4 }, weight: 8 },
  { timeSignature: { numerator: 6, denominator: 8 }, weight: 10 },
  { timeSignature: { numerator: 12, denominator: 8 }, weight: 7 },
];

// Tempo ranges (BPM) with weights - weighted against extremes
const TEMPO_RANGES = [
  { min: 20, max: 50, weight: 2 },   // Very slow - low weight
  { min: 50, max: 80, weight: 15 },  // Slow - moderate weight
  { min: 80, max: 120, weight: 40 }, // Moderate - high weight (most common)
  { min: 120, max: 160, weight: 30 }, // Fast - high weight
  { min: 160, max: 200, weight: 10 }, // Very fast - moderate weight
  { min: 200, max: 300, weight: 3 },  // Extremely fast - low weight
];

/**
 * Randomly selects a weighted item from an array
 */
function weightedRandom<T>(items: Array<{ item: T; weight: number }>): T {
  const totalWeight = items.reduce((sum, { weight }) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const { item, weight } of items) {
    random -= weight;
    if (random <= 0) {
      return item;
    }
  }
  
  // Fallback (shouldn't happen)
  return items[0].item;
}

/**
 * Randomly selects a chord progression
 */
export function randomChordProgression(): ChordProgressionConfig {
  const index = Math.floor(Math.random() * COMMON_CHORD_PROGRESSIONS.length);
  return COMMON_CHORD_PROGRESSIONS[index];
}

/**
 * Randomly selects a key
 */
export function randomKey(): Key {
  const index = Math.floor(Math.random() * ALL_KEYS.length);
  return ALL_KEYS[index];
}

/**
 * Randomly selects a time signature (weighted by popularity)
 */
export function randomTimeSignature(): TimeSignature {
  return weightedRandom(
    TIME_SIGNATURES.map(({ timeSignature, weight }) => ({ item: timeSignature, weight }))
  );
}

/**
 * Randomly selects a tempo (BPM) within reasonable bounds (20-300)
 * Weighted against extremes for more musical results
 */
export function randomTempo(): number {
  // Weighted random selection of tempo range
  const range = weightedRandom(
    TEMPO_RANGES.map(r => ({ item: r, weight: r.weight }))
  );
  
  // Random tempo within that range
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

/**
 * Randomly selects a chord styling strategy compatible with the given time signature
 */
export function randomStylingStrategy(timeSignature: TimeSignature): ChordStylingStrategy {
  const compatibleStrategies = Object.entries(CHORD_STYLING_STRATEGIES)
    .filter(([, config]) => 
      config.compatibleTimeSignatures.some(
        ts => ts.numerator === timeSignature.numerator && ts.denominator === timeSignature.denominator
      )
    )
    .map(([key]) => key as ChordStylingStrategy);
  
  if (compatibleStrategies.length === 0) {
    return 'simple'; // Fallback
  }
  
  const index = Math.floor(Math.random() * compatibleStrategies.length);
  return compatibleStrategies[index];
}

// Measures per chord weights - higher values are less likely
const MEASURES_PER_CHORD_WEIGHTS = [
  { value: 1, weight: 60 }, // Most common - 1 measure per chord
  { value: 2, weight: 25 },  // Less common
  { value: 3, weight: 10 },  // Rare
  { value: 4, weight: 5 },   // Very rare
];

/**
 * Randomly selects measures per chord (1-4) with weighted selection
 * Higher values are less likely
 */
export function randomMeasuresPerChord(): number {
  return weightedRandom(
    MEASURES_PER_CHORD_WEIGHTS.map(({ value, weight }) => ({ item: value, weight }))
  );
}

