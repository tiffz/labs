/**
 * Chord styling utilities for generating different chord patterns
 * Based on Piano for Singers course strategies
 * Uses human-readable pattern notation (similar to darbuka app)
 */

import type { Chord, ChordStylingStrategy, TimeSignature } from '../types';
import { validateMeasureDurations } from './durationValidation';
import { CHORD_STYLING_PATTERNS, timeSignatureToKey } from '../data/chordStylingPatterns';
import { parseChordPattern, validatePatternLength } from './chordPatternParser';

export interface StyledChordNotes {
  bassNotes: Array<{ notes: number[]; duration: string }>; // Array of bass note groups with durations
  trebleNotes: Array<{ notes: number[]; duration: string }>; // Array of treble note groups with durations
}

/**
 * Gets the default measure duration for a time signature (fallback)
 */
function getMeasureDuration(timeSignature: TimeSignature): string {
  if (timeSignature.numerator === 4 && timeSignature.denominator === 4) {
    return 'w'; // Whole note = 4 beats
  }
  if (timeSignature.numerator === 3 && timeSignature.denominator === 4) {
    return 'hd'; // Dotted half note = 3 beats
  }
  if (timeSignature.numerator === 2 && timeSignature.denominator === 4) {
    return 'h'; // Half note = 2 beats
  }
  if (timeSignature.numerator === 6 && timeSignature.denominator === 8) {
    return 'hd'; // Dotted half note = 6 eighth notes
  }
  if (timeSignature.numerator === 12 && timeSignature.denominator === 8) {
    return 'hd'; // Dotted half note (will be used twice)
  }
  // Default fallback
  return 'w';
}

/**
 * Generates styled chord notes based on the styling strategy and time signature
 * Uses human-readable pattern notation from chordStylingPatterns.ts
 */
export function generateStyledChordNotes(
  chord: Chord,
  trebleVoicing: number[],
  bassVoicing: number[],
  strategy: ChordStylingStrategy,
  timeSignature: TimeSignature
): StyledChordNotes {
  // Get the pattern configuration for this strategy and time signature
  const patternConfig = CHORD_STYLING_PATTERNS[strategy];
  if (!patternConfig) {
    // Fallback to simple if strategy not found
    return {
      bassNotes: [{ notes: [bassVoicing[0]], duration: getMeasureDuration(timeSignature) }],
      trebleNotes: [{ notes: trebleVoicing, duration: getMeasureDuration(timeSignature) }],
    };
  }

  const timeSigKey = timeSignatureToKey(timeSignature);
  const pattern = patternConfig.patterns[timeSigKey];
  
  if (!pattern) {
    // No pattern for this time signature, fallback to simple
    return {
      bassNotes: [{ notes: [bassVoicing[0]], duration: getMeasureDuration(timeSignature) }],
      trebleNotes: [{ notes: trebleVoicing, duration: getMeasureDuration(timeSignature) }],
    };
  }

  // Validate pattern lengths
  if (!validatePatternLength(pattern.treble, timeSignature) || 
      !validatePatternLength(pattern.bass, timeSignature)) {
    console.warn(`Pattern length mismatch for ${strategy} in ${timeSigKey}, falling back to simple`);
    return {
      bassNotes: [{ notes: [bassVoicing[0]], duration: getMeasureDuration(timeSignature) }],
      trebleNotes: [{ notes: trebleVoicing, duration: getMeasureDuration(timeSignature) }],
    };
  }

  // Parse the patterns into note groups
  const trebleNotes = parseChordPattern(pattern.treble, chord, trebleVoicing);
  const bassNotes = parseChordPattern(pattern.bass, chord, bassVoicing);

  // Validate durations
  const trebleDurations = trebleNotes.map(n => n.duration);
  const bassDurations = bassNotes.map(n => n.duration);
  
  const trebleValidation = validateMeasureDurations(trebleDurations, timeSignature);
  const bassValidation = validateMeasureDurations(bassDurations, timeSignature);

  if (!trebleValidation.isValid || !bassValidation.isValid) {
    console.warn(`Duration validation failed for ${strategy} in ${timeSigKey}, falling back to simple`);
    return {
      bassNotes: [{ notes: [bassVoicing[0]], duration: getMeasureDuration(timeSignature) }],
      trebleNotes: [{ notes: trebleVoicing, duration: getMeasureDuration(timeSignature) }],
    };
  }

  return {
    trebleNotes,
    bassNotes,
  };
}
