/**
 * Utilities for validating and calculating note durations
 */

import type { TimeSignature } from '../types';

/**
 * Converts VexFlow duration string to beats
 * 'w' = whole note, 'h' = half, 'q' = quarter, '8' = eighth, '16' = sixteenth
 * 'd' suffix = dotted (1.5x duration)
 * 'r' suffix = rest (same duration)
 */
export function durationToBeats(duration: string, beatValue: number): number {
  // Remove 'r' suffix if present (rests have same duration)
  const cleanDuration = duration.replace('r', '');
  
  // Check for dotted note
  const isDotted = cleanDuration.includes('d');
  const baseDuration = cleanDuration.replace('d', '');
  
  let beats = 0;
  
  switch (baseDuration) {
    case 'w':
      beats = 4; // Whole note = 4 quarter notes
      break;
    case 'h':
      beats = 2; // Half note = 2 quarter notes
      break;
    case 'q':
      beats = 1; // Quarter note = 1 quarter note
      break;
    case '8':
      beats = 0.5; // Eighth note = 0.5 quarter notes
      break;
    case '16':
      beats = 0.25; // Sixteenth note = 0.25 quarter notes
      break;
    default:
      console.warn(`Unknown duration: ${baseDuration}`);
      beats = 1;
  }
  
  // Apply dotted modifier
  if (isDotted) {
    beats *= 1.5;
  }
  
  // Convert to the beat value (e.g., if beatValue is 8, we need to convert quarter beats to eighth beats)
  // For 4/4: beatValue = 4, so beats stay as-is (4/4 = 1)
  // For 6/8: beatValue = 8, so we need to convert quarter beats to eighth beats (8/4 = 2)
  // For 12/8: beatValue = 8, so we need to convert quarter beats to eighth beats (8/4 = 2)
  const conversionFactor = beatValue / 4; // Convert from quarter-note beats to beat-value beats
  return beats * conversionFactor;
}

/**
 * Validates that durations add up to the correct number of beats for a measure
 */
export function validateMeasureDurations(
  durations: string[],
  timeSignature: TimeSignature
): { isValid: boolean; totalBeats: number; expectedBeats: number } {
  const totalBeats = durations.reduce((sum, duration) => {
    return sum + durationToBeats(duration, timeSignature.denominator);
  }, 0);
  
  const expectedBeats = timeSignature.numerator;
  
  return {
    isValid: Math.abs(totalBeats - expectedBeats) < 0.01, // Allow small floating point errors
    totalBeats,
    expectedBeats,
  };
}

