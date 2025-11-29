import { describe, it, expect } from 'vitest';
import { getPatternDuration } from './dragAndDrop';
import { parsePatternToNotes } from './notationHelpers';
import type { TimeSignature } from '../types';

/**
 * Calculate remaining beats in the last measure
 * This matches the logic in App.tsx
 * IMPORTANT: Calculate from raw notation, not parsed rhythm, because parseRhythm
 * auto-fills incomplete measures with rests, which would make remainingBeats always return
 * full measure. We need to know the ACTUAL remaining space before auto-fill.
 */
function calculateRemainingBeats(notation: string, timeSignature: TimeSignature): number {
  // Calculate sixteenths per measure
  const beatsPerMeasure = timeSignature.denominator === 8
    ? timeSignature.numerator * 2  // eighth notes -> sixteenths
    : timeSignature.numerator * 4; // quarter notes -> sixteenths
  
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

describe('Measure Validation', () => {
  describe('calculateRemainingBeats', () => {
    it('should return full measure for empty notation', () => {
      const remaining = calculateRemainingBeats('', { numerator: 4, denominator: 4 });
      expect(remaining).toBe(16); // 4/4 = 16 sixteenths
    });

    it('should calculate remaining beats for incomplete measure', () => {
      // 4/4 time, 12 sixteenths used, 4 remaining
      const remaining = calculateRemainingBeats('D---T---K---', { numerator: 4, denominator: 4 });
      expect(remaining).toBe(4);
    });

    it('should return full measure when last measure is complete', () => {
      // 4/4 time, exactly 16 sixteenths (complete measure)
      const remaining = calculateRemainingBeats('D---T---K---T---', { numerator: 4, denominator: 4 });
      expect(remaining).toBe(16); // Full measure for next measure
    });

    it('should handle 3/4 time signature', () => {
      // 3/4 time = 12 sixteenths per measure
      const remaining = calculateRemainingBeats('D---T---', { numerator: 3, denominator: 4 });
      expect(remaining).toBe(4); // 12 - 8 = 4 remaining
    });

    it('should handle 6/8 time signature', () => {
      // 6/8 time = 12 sixteenths per measure (6 * 2)
      const remaining = calculateRemainingBeats('D-T-K-T-', { numerator: 6, denominator: 8 });
      expect(remaining).toBe(4); // 12 - 8 = 4 remaining
    });

    it('should handle multiple complete measures', () => {
      // Two complete measures of 4/4
      const remaining = calculateRemainingBeats('D---T---K---T---D---T---K---T---', { numerator: 4, denominator: 4 });
      expect(remaining).toBe(16); // Full measure for next measure
    });
  });

  describe('canAddPattern validation', () => {
    it('should allow patterns that fit in remaining space', () => {
      const remaining = 8; // 8 sixteenths remaining
      const pattern = 'D---T---'; // 8 sixteenths
      const duration = getPatternDuration(pattern);
      
      expect(duration).toBe(8);
      expect(duration <= remaining).toBe(true);
    });

    it('should disallow patterns that exceed remaining space', () => {
      const remaining = 4; // 4 sixteenths remaining
      const pattern = 'D---T---'; // 8 sixteenths
      const duration = getPatternDuration(pattern);
      
      expect(duration).toBe(8);
      expect(duration <= remaining).toBe(false);
    });

    it('should allow patterns that exactly fit remaining space', () => {
      const remaining = 4; // 4 sixteenths remaining
      const pattern = 'D---'; // 4 sixteenths
      const duration = getPatternDuration(pattern);
      
      expect(duration).toBe(4);
      expect(duration <= remaining).toBe(true);
    });

    it('should handle single sixteenth note', () => {
      const remaining = 1; // 1 sixteenth remaining
      const pattern = 'D'; // 1 sixteenth
      const duration = getPatternDuration(pattern);
      
      expect(duration).toBe(1);
      expect(duration <= remaining).toBe(true);
    });

    it('should handle dotted quarter note (6 sixteenths)', () => {
      const remaining = 6; // 6 sixteenths remaining
      const pattern = 'D-----'; // 6 sixteenths (dotted quarter)
      const duration = getPatternDuration(pattern);
      
      expect(duration).toBe(6);
      expect(duration <= remaining).toBe(true);
    });

    it('should disallow dotted quarter when only 4 sixteenths remain', () => {
      const remaining = 4; // 4 sixteenths remaining
      const pattern = 'D-----'; // 6 sixteenths (dotted quarter)
      const duration = getPatternDuration(pattern);
      
      expect(duration).toBe(6);
      expect(duration <= remaining).toBe(false);
    });
  });

  describe('integration with parseRhythm', () => {
    it('should correctly calculate remaining beats after parsing', () => {
      // Create notation with incomplete last measure
      const notation = 'D---T---K---'; // 12 sixteenths in 4/4 (4 remaining)
      const remaining = calculateRemainingBeats(notation, { numerator: 4, denominator: 4 });
      
      expect(remaining).toBe(4);
      
      // Verify a 4-sixteenth pattern fits
      const pattern = 'T---'; // 4 sixteenths
      const duration = getPatternDuration(pattern);
      expect(duration <= remaining).toBe(true);
      
      // Verify a 6-sixteenth pattern doesn't fit
      const longPattern = 'D-----'; // 6 sixteenths
      const longDuration = getPatternDuration(longPattern);
      expect(longDuration <= remaining).toBe(false);
    });

    it('should calculate remaining beats before auto-fill', () => {
      // parseRhythm auto-fills incomplete measures with rests, but we calculate
      // remainingBeats from raw notation BEFORE auto-fill
      const notation = 'D---T---K---'; // 12 sixteenths in 4/4
      
      // remainingBeats should show 4 remaining (before auto-fill)
      const remaining = calculateRemainingBeats(notation, { numerator: 4, denominator: 4 });
      expect(remaining).toBe(4); // 16 - 12 = 4 remaining
      
      // After adding 4 more sixteenths, measure would be complete
      const completeNotation = notation + 'T---'; // 16 sixteenths
      const remainingAfterComplete = calculateRemainingBeats(completeNotation, { numerator: 4, denominator: 4 });
      expect(remainingAfterComplete).toBe(16); // Full measure for next measure
    });
  });
});

