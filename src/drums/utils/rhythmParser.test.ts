import { describe, it, expect } from 'vitest';
import { parseNotation, parseRhythm, detectIdenticalMeasures } from './rhythmParser';
import type { Measure } from '../types';

describe('rhythmParser', () => {
  describe('parseNotation', () => {
    it('should parse a simple rhythm notation', () => {
      const notes = parseNotation('D-T-K-');

      expect(notes).toHaveLength(3);
      expect(notes[0]).toEqual({
        sound: 'dum',
        duration: 'eighth',
        durationInSixteenths: 2,
        isDotted: false,
      });
      expect(notes[1]).toEqual({
        sound: 'tak',
        duration: 'eighth',
        durationInSixteenths: 2,
        isDotted: false,
      });
      expect(notes[2]).toEqual({
        sound: 'ka',
        duration: 'eighth',
        durationInSixteenths: 2,
        isDotted: false,
      });
    });

    it('should parse the example notation D-T-__T-D---T---', () => {
      const notes = parseNotation('D-T-__T-D---T---');

      expect(notes).toHaveLength(6);

      // D- (eighth note = 2 sixteenths)
      expect(notes[0]).toEqual({
        sound: 'dum',
        duration: 'eighth',
        durationInSixteenths: 2,
        isDotted: false,
      });

      // T- (eighth note = 2 sixteenths)
      expect(notes[1]).toEqual({
        sound: 'tak',
        duration: 'eighth',
        durationInSixteenths: 2,
        isDotted: false,
      });

      // __ (eighth rest = 2 sixteenths, consolidated)
      expect(notes[2]).toEqual({
        sound: 'rest',
        duration: 'eighth',
        durationInSixteenths: 2,
        isDotted: false,
      });

      // T- (eighth note = 2 sixteenths)
      expect(notes[3]).toEqual({
        sound: 'tak',
        duration: 'eighth',
        durationInSixteenths: 2,
        isDotted: false,
      });

      // D--- (quarter note = 4 sixteenths)
      expect(notes[4]).toEqual({
        sound: 'dum',
        duration: 'quarter',
        durationInSixteenths: 4,
        isDotted: false,
      });

      // T--- (quarter note = 4 sixteenths)
      expect(notes[5]).toEqual({
        sound: 'tak',
        duration: 'quarter',
        durationInSixteenths: 4,
        isDotted: false,
      });
    });

    it('should handle lowercase notation', () => {
      const notes = parseNotation('d-t-k-');

      expect(notes).toHaveLength(3);
      expect(notes[0].sound).toBe('dum');
      expect(notes[1].sound).toBe('tak');
      expect(notes[2].sound).toBe('ka');
    });

    it('should handle mixed case notation', () => {
      const notes = parseNotation('D-t-K-');

      expect(notes).toHaveLength(3);
      expect(notes[0].sound).toBe('dum');
      expect(notes[1].sound).toBe('tak');
      expect(notes[2].sound).toBe('ka');
    });

    it('should handle spaces in notation', () => {
      const notes = parseNotation('D- T- K-');

      expect(notes).toHaveLength(3);
      expect(notes[0].sound).toBe('dum');
      expect(notes[1].sound).toBe('tak');
      expect(notes[2].sound).toBe('ka');
    });

    it('should handle different note durations', () => {
      const notes = parseNotation('D D- D--- D-------');

      expect(notes).toHaveLength(4);
      expect(notes[0].duration).toBe('sixteenth');
      expect(notes[1].duration).toBe('eighth');
      expect(notes[2].duration).toBe('quarter');
      expect(notes[3].duration).toBe('half');
    });

    it('should parse rests', () => {
      const notes = parseNotation('D-__T-');

      expect(notes).toHaveLength(3);
      expect(notes[0].sound).toBe('dum');
      expect(notes[1].sound).toBe('rest');
      expect(notes[1].duration).toBe('eighth');
      expect(notes[2].sound).toBe('tak');
    });

    it('should correctly parse notation with broken tied note (D-------KD------)', () => {
      // This pattern results from breaking a whole note at position 8 and inserting K
      const notes = parseNotation('D-------KD------');

      expect(notes).toHaveLength(3);
      // First D with 7 dashes = 8 sixteenths (half note)
      expect(notes[0].sound).toBe('dum');
      expect(notes[0].durationInSixteenths).toBe(8);
      expect(notes[0].duration).toBe('half');

      // K with no extensions = 1 sixteenth
      expect(notes[1].sound).toBe('ka');
      expect(notes[1].durationInSixteenths).toBe(1);
      expect(notes[1].duration).toBe('sixteenth');

      // Second D with 6 dashes = 7 sixteenths
      expect(notes[2].sound).toBe('dum');
      expect(notes[2].durationInSixteenths).toBe(7);
    });

    it('should correctly parse adjacent notes of different sounds', () => {
      // Ensure that adjacent different sounds are parsed as separate notes
      const notes = parseNotation('KT---');

      expect(notes).toHaveLength(2);
      expect(notes[0].sound).toBe('ka');
      expect(notes[0].durationInSixteenths).toBe(1);
      expect(notes[1].sound).toBe('tak');
      expect(notes[1].durationInSixteenths).toBe(4);
    });

    it('should parse dotted notes', () => {
      const notes = parseNotation('D-- D----- D-----------');

      expect(notes).toHaveLength(3);
      // D-- = 3 sixteenths = dotted eighth
      expect(notes[0]).toEqual({
        sound: 'dum',
        duration: 'eighth',
        durationInSixteenths: 3,
        isDotted: true,
      });
      // D----- = 6 sixteenths = dotted quarter
      expect(notes[1]).toEqual({
        sound: 'dum',
        duration: 'quarter',
        durationInSixteenths: 6,
        isDotted: true,
      });
      // D----------- = 12 sixteenths = dotted half
      expect(notes[2]).toEqual({
        sound: 'dum',
        duration: 'half',
        durationInSixteenths: 12,
        isDotted: true,
      });
    });
  });

  describe('parseRhythm', () => {
    it('should split notes into measures for 4/4 time', () => {
      const rhythm = parseRhythm('D-T-__T-D---T---', { numerator: 4, denominator: 4 });

      expect(rhythm.measures).toHaveLength(1);
      expect(rhythm.measures[0].notes).toHaveLength(6);
      expect(rhythm.measures[0].totalDuration).toBe(16); // 4+2+2+2+2+4 = 16 sixteenths
      expect(rhythm.isValid).toBe(true);
    });

    it('should split notes into multiple measures', () => {
      const rhythm = parseRhythm('D-T-__T-D---T---D-T-__T-D---T---', { numerator: 4, denominator: 4 });

      expect(rhythm.measures).toHaveLength(2);
      expect(rhythm.measures[0].totalDuration).toBe(16);
      expect(rhythm.measures[1].totalDuration).toBe(16);
      expect(rhythm.isValid).toBe(true);
    });

    it('should handle 3/4 time signature', () => {
      const rhythm = parseRhythm('D---T-K-D-D-', { numerator: 3, denominator: 4 });

      expect(rhythm.measures).toHaveLength(1);
      expect(rhythm.measures[0].totalDuration).toBe(12); // 4+2+2+2+2 = 12 sixteenths (3 beats)
      expect(rhythm.isValid).toBe(true);
    });

    it('should handle 6/8 time signature', () => {
      const rhythm = parseRhythm('D---T-K-D-D-', { numerator: 6, denominator: 8 });

      expect(rhythm.measures).toHaveLength(1);
      expect(rhythm.measures[0].totalDuration).toBe(12); // 6 eighth notes = 12 sixteenths
      expect(rhythm.isValid).toBe(true);
    });

    it('should handle empty notation', () => {
      const rhythm = parseRhythm('', { numerator: 4, denominator: 4 });

      expect(rhythm.measures).toHaveLength(0);
      expect(rhythm.isValid).toBe(true);
    });

    it('should auto-fill incomplete last measure', () => {
      const rhythm = parseRhythm('D---T-', { numerator: 4, denominator: 4 });

      expect(rhythm.measures).toHaveLength(1);
      // D--- (4 sixteenths) + T- (2 sixteenths) + auto-filled rest (10 sixteenths) = 16 sixteenths
      expect(rhythm.measures[0].totalDuration).toBe(16);
      expect(rhythm.isValid).toBe(true);
    });

    it('should split long notes across measures and auto-fill', () => {
      // D--------------- is 16 sixteenths (one full measure)
      // T- is 2 sixteenths (starts a new measure, then auto-filled to 16)
      const rhythm = parseRhythm('D---------------T-', { numerator: 4, denominator: 4 });

      expect(rhythm.measures).toHaveLength(2);
      expect(rhythm.measures[0].totalDuration).toBe(16);
      // T- (2 sixteenths) + auto-filled rest (14 sixteenths) = 16 sixteenths
      expect(rhythm.measures[1].totalDuration).toBe(16);
      expect(rhythm.isValid).toBe(true);
    });
  });

  describe('repeat notation', () => {
    it('should expand single measure repeat syntax: D-T-D-T-D-T-D-T-|x4', () => {
      // 16 sixteenths repeated 4 times (Total 4)
      const rhythm = parseRhythm('D-T-D-T-D-T-D-T-|x4', { numerator: 4, denominator: 4 });

      expect(rhythm.measures).toHaveLength(4);
      expect(rhythm.isValid).toBe(true);

      // All measures should have same content
      for (const measure of rhythm.measures) {
        expect(measure.totalDuration).toBe(16);
        expect(measure.notes[0].sound).toBe('dum');
      }

      // Should have a measure repeat marker
      expect(rhythm.repeats).toBeDefined();
      expect(rhythm.repeats?.length).toBeGreaterThan(0);

      const measureRepeat = rhythm.repeats?.find(r => r.type === 'measure');
      expect(measureRepeat).toBeDefined();
      if (measureRepeat && measureRepeat.type === 'measure') {
        expect(measureRepeat.sourceMeasure).toBe(0);
        expect(measureRepeat.repeatMeasures).toEqual([1, 2, 3]);
      }
    });

    it('should expand section repeat syntax: |: D-T-D-T-D-T-D-T- | D---T---D---T--- :| x2', () => {
      // Logic Check: count=2 means "2 Total Instances" (Source + 1 Repeat)
      // Source block = 2 measures.
      // Total measures = 2 * 2 = 4 measures.
      // Phase 23: Section repeats are physically unrolled in the measures array (for linear playback),
      // but logically grouped via 'repeats' metadata.
      const rhythm = parseRhythm('|: D-T-D-T-D-T-D-T- | D---T---D---T--- :| x2', {
        numerator: 4,
        denominator: 4,
      });

      // Expect expanded form
      expect(rhythm.measures).toHaveLength(4);
      expect(rhythm.isValid).toBe(true);

      // Should have a section repeat marker
      expect(rhythm.repeats).toBeDefined();
      const sectionRepeat = rhythm.repeats?.find(r => r.type === 'section');
      expect(sectionRepeat).toBeDefined();
      if (sectionRepeat && sectionRepeat.type === 'section') {
        expect(sectionRepeat.repeatCount).toBe(2);
      }
    });

    it('should handle repeat count of 1 (no actual repeat)', () => {
      const rhythm = parseRhythm('D-T-D-T-D-T-D-T-|x1', { numerator: 4, denominator: 4 });

      expect(rhythm.measures).toHaveLength(1);
      expect(rhythm.isValid).toBe(true);
    });

    it('should auto-detect consecutive identical measures (implicit repeats)', () => {
      // Same notation repeated 3 times manually (no repeat syntax)
      // Auto-detection is ENABLED
      const rhythm = parseRhythm('D-T-D-T-D-T-D-T- D-T-D-T-D-T-D-T- D-T-D-T-D-T-D-T-', {
        numerator: 4,
        denominator: 4,
      });

      expect(rhythm.measures).toHaveLength(3);
      expect(rhythm.isValid).toBe(true);

      // Should auto-detect repeats
      expect(rhythm.repeats).toBeDefined();
      expect(rhythm.repeats?.length).toBeGreaterThan(0);
      const measureRepeat = rhythm.repeats?.find(r => r.type === 'measure');
      expect(measureRepeat).toBeDefined();
    });

    it('should not create repeat markers for different measures', () => {
      // Different measures - no repeat should be detected
      const rhythm = parseRhythm('D-T-D-T-D-T-D-T- T-D-T-D-T-D-T-D-', {
        numerator: 4,
        denominator: 4,
      });

      expect(rhythm.measures).toHaveLength(2);
      expect(rhythm.isValid).toBe(true);

      // No repeats should be detected
      expect(rhythm.repeats).toBeUndefined();
    });
  });

  describe('detectIdenticalMeasures', () => {
    it('should detect two identical measures', () => {
      const measures: Measure[] = [
        { notes: [{ sound: 'dum', duration: 'quarter', durationInSixteenths: 4, isDotted: false }], totalDuration: 4 },
        { notes: [{ sound: 'dum', duration: 'quarter', durationInSixteenths: 4, isDotted: false }], totalDuration: 4 },
      ];

      const repeats = detectIdenticalMeasures(measures);

      expect(repeats).toHaveLength(1);
      expect(repeats[0].type).toBe('measure');
      if (repeats[0].type === 'measure') {
        expect(repeats[0].sourceMeasure).toBe(0);
        expect(repeats[0].repeatMeasures).toEqual([1]);
      }
    });

    it('should handle multiple separate repeat groups', () => {
      const measures: Measure[] = [
        { notes: [{ sound: 'dum', duration: 'quarter', durationInSixteenths: 4, isDotted: false }], totalDuration: 4 },
        { notes: [{ sound: 'dum', duration: 'quarter', durationInSixteenths: 4, isDotted: false }], totalDuration: 4 },
        { notes: [{ sound: 'tak', duration: 'quarter', durationInSixteenths: 4, isDotted: false }], totalDuration: 4 },
        { notes: [{ sound: 'ka', duration: 'quarter', durationInSixteenths: 4, isDotted: false }], totalDuration: 4 },
        { notes: [{ sound: 'ka', duration: 'quarter', durationInSixteenths: 4, isDotted: false }], totalDuration: 4 },
      ];

      const repeats = detectIdenticalMeasures(measures);

      expect(repeats).toHaveLength(2);
      // First group: measures 0-1 (dum)
      if (repeats[0].type === 'measure') {
        expect(repeats[0].sourceMeasure).toBe(0);
        expect(repeats[0].repeatMeasures).toEqual([1]);
      }
      // Second group: measures 3-4 (ka)
      if (repeats[1].type === 'measure') {
        expect(repeats[1].sourceMeasure).toBe(3);
        expect(repeats[1].repeatMeasures).toEqual([4]);
      }
    });

    it('should return empty array for no repeats', () => {
      const measures: Measure[] = [
        { notes: [{ sound: 'dum', duration: 'quarter', durationInSixteenths: 4, isDotted: false }], totalDuration: 4 },
        { notes: [{ sound: 'tak', duration: 'quarter', durationInSixteenths: 4, isDotted: false }], totalDuration: 4 },
        { notes: [{ sound: 'ka', duration: 'quarter', durationInSixteenths: 4, isDotted: false }], totalDuration: 4 },
      ];

      const repeats = detectIdenticalMeasures(measures);

      expect(repeats).toHaveLength(0);
    });
  });
});

