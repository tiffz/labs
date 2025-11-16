import { describe, it, expect } from 'vitest';
import { parseNotation, parseRhythm } from './rhythmParser';

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

    it('should allow incomplete last measure', () => {
      const rhythm = parseRhythm('D---T-', { numerator: 4, denominator: 4 });
      
      expect(rhythm.measures).toHaveLength(1);
      expect(rhythm.measures[0].totalDuration).toBe(6); // 4+2 = 6 sixteenths (incomplete measure)
      expect(rhythm.isValid).toBe(true);
    });

    it('should split long notes across measures', () => {
      // D--------------- is 16 sixteenths (one full measure)
      // T- is 2 sixteenths (starts a new measure)
      const rhythm = parseRhythm('D---------------T-', { numerator: 4, denominator: 4 });
      
      expect(rhythm.measures).toHaveLength(2);
      expect(rhythm.measures[0].totalDuration).toBe(16);
      expect(rhythm.measures[1].totalDuration).toBe(2);
      expect(rhythm.isValid).toBe(true);
    });
  });
});

