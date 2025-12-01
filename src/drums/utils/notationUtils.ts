import { parsePatternToNotes } from './notationHelpers';
import { getSixteenthsPerMeasure } from './timeSignatureUtils';
import type { TimeSignature } from '../types';

/**
 * Calculate remaining beats (in sixteenths) in the current measure
 * @param notation - The current notation string
 * @param timeSignature - The time signature
 * @returns Number of sixteenth notes remaining in the current measure
 */
export function calculateRemainingBeats(
  notation: string,
  timeSignature: TimeSignature
): number {
  const beatsPerMeasure = getSixteenthsPerMeasure(timeSignature);
  
  if (!notation || notation.trim().length === 0) {
    return beatsPerMeasure; // Empty, so full measure available
  }
  
  // Parse notation to get actual note durations (without auto-fill)
  const cleanNotation = notation.replace(/[\s\n]/g, '');
  if (cleanNotation.length === 0) {
    return beatsPerMeasure;
  }
  
  // Calculate total duration in sixteenths from raw notation
  const notes = parsePatternToNotes(cleanNotation);
  const totalDuration = notes.reduce((sum, note) => sum + note.duration, 0);
  
  // Calculate which measure we're in and how much space remains
  const positionInMeasure = totalDuration % beatsPerMeasure;
  const remaining = beatsPerMeasure - positionInMeasure;
  
  // If we're exactly at a measure boundary, return full measure for next measure
  return remaining === beatsPerMeasure ? beatsPerMeasure : remaining;
}

