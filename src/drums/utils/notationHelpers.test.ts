import { describe, it, expect } from 'vitest';
import { buildNotationFromSelection, parsePatternToNotes } from './notationHelpers';
import type { NotePosition } from './dropTargetFinder';
import type { ParsedRhythm } from '../types';

describe('parsePatternToNotes', () => {
  it('should parse simple notes', () => {
    const notes = parsePatternToNotes('DTKS');
    expect(notes).toEqual([
      { sound: 'dum', duration: 1 },
      { sound: 'tak', duration: 1 },
      { sound: 'ka', duration: 1 },
      { sound: 'slap', duration: 1 },
    ]);
  });

  it('should parse notes with dashes (duration extension)', () => {
    const notes = parsePatternToNotes('D-T-');
    expect(notes).toEqual([
      { sound: 'dum', duration: 2 },
      { sound: 'tak', duration: 2 },
    ]);
  });

  it('should parse rests as underscores', () => {
    const notes = parsePatternToNotes('D___T___');
    expect(notes).toEqual([
      { sound: 'dum', duration: 1 },
      { sound: 'rest', duration: 3 },
      { sound: 'tak', duration: 1 },
      { sound: 'rest', duration: 3 },
    ]);
  });
});

describe('buildNotationFromSelection', () => {
  // Helper to create a NotePosition for testing
  function makePos(
    measureIndex: number,
    noteIndex: number,
    charPosition: number,
    durationInSixteenths: number
  ): NotePosition {
    return {
      measureIndex,
      noteIndex,
      charPosition,
      x: 100 + charPosition * 20,
      y: 60,
      width: durationInSixteenths * 20,
      height: 20,
      durationInSixteenths,
      staveY: 40,
    };
  }

  // Simple rhythm with 2 measures of 4/4 (16 sixteenths each)
  const twoMeasureRhythm: ParsedRhythm = {
    isValid: true,
    measures: [
      {
        notes: [
          { sound: 'dum', duration: 'eighth', durationInSixteenths: 2, isDotted: false },
          { sound: 'rest', duration: 'eighth', durationInSixteenths: 2, isDotted: false },
          { sound: 'tak', duration: 'sixteenth', durationInSixteenths: 1, isDotted: false },
          { sound: 'ka', duration: 'sixteenth', durationInSixteenths: 1, isDotted: false },
          { sound: 'tak', duration: 'eighth', durationInSixteenths: 2, isDotted: false },
          { sound: 'dum', duration: 'quarter', durationInSixteenths: 4, isDotted: false },
          { sound: 'rest', duration: 'quarter', durationInSixteenths: 4, isDotted: false },
        ],
        totalDuration: 16,
      },
      {
        notes: [
          { sound: 'slap', duration: 'sixteenth', durationInSixteenths: 1, isDotted: false },
          { sound: 'tak', duration: 'sixteenth', durationInSixteenths: 1, isDotted: false },
          { sound: 'ka', duration: 'sixteenth', durationInSixteenths: 1, isDotted: false },
          { sound: 'tak', duration: 'sixteenth', durationInSixteenths: 1, isDotted: false },
          { sound: 'dum', duration: 'quarter', durationInSixteenths: 4, isDotted: false },
          { sound: 'tak', duration: 'quarter', durationInSixteenths: 4, isDotted: false },
          { sound: 'ka', duration: 'quarter', durationInSixteenths: 4, isDotted: false },
        ],
        totalDuration: 16,
      },
    ],
    error: undefined,
  };

  // Positions for first measure: D-__TKT-D---____
  const measure0Positions: NotePosition[] = [
    makePos(0, 0, 0, 2),   // D- at tick 0
    makePos(0, 1, 2, 2),   // __ at tick 2
    makePos(0, 2, 4, 1),   // T at tick 4
    makePos(0, 3, 5, 1),   // K at tick 5
    makePos(0, 4, 6, 2),   // T- at tick 6
    makePos(0, 5, 8, 4),   // D--- at tick 8
    makePos(0, 6, 12, 4),  // ____ at tick 12
  ];

  // Positions for second measure: STKTD---T---K---
  const measure1Positions: NotePosition[] = [
    makePos(1, 0, 16, 1),  // S at tick 16
    makePos(1, 1, 17, 1),  // T at tick 17
    makePos(1, 2, 18, 1),  // K at tick 18
    makePos(1, 3, 19, 1),  // T at tick 19
    makePos(1, 4, 20, 4),  // D--- at tick 20
    makePos(1, 5, 24, 4),  // T--- at tick 24
    makePos(1, 6, 28, 4),  // K--- at tick 28
  ];

  const allPositions = [...measure0Positions, ...measure1Positions];

  it('should build notation for a single sixteenth note', () => {
    const result = buildNotationFromSelection(
      allPositions, twoMeasureRhythm, 4, 5
    );
    expect(result).toBe('T');
  });

  it('should build notation for an eighth note (2 sixteenths)', () => {
    const result = buildNotationFromSelection(
      allPositions, twoMeasureRhythm, 0, 2
    );
    expect(result).toBe('D-');
  });

  it('should build notation for a quarter note (4 sixteenths)', () => {
    const result = buildNotationFromSelection(
      allPositions, twoMeasureRhythm, 8, 12
    );
    expect(result).toBe('D---');
  });

  it('should build notation for rest notes using underscores', () => {
    const result = buildNotationFromSelection(
      allPositions, twoMeasureRhythm, 2, 4
    );
    expect(result).toBe('__');
  });

  it('should build notation for a quarter rest', () => {
    const result = buildNotationFromSelection(
      allPositions, twoMeasureRhythm, 12, 16
    );
    expect(result).toBe('____');
  });

  it('should build notation spanning multiple notes in one measure', () => {
    const result = buildNotationFromSelection(
      allPositions, twoMeasureRhythm, 4, 8
    );
    // T (tick 4), K (tick 5), T- (tick 6-7)
    expect(result).toBe('TKT-');
  });

  it('should build notation for an entire measure', () => {
    const result = buildNotationFromSelection(
      allPositions, twoMeasureRhythm, 0, 16
    );
    // D-__TKT-D---____
    expect(result).toBe('D-__TKT-D---____');
  });

  it('should build notation spanning across measure boundaries', () => {
    const result = buildNotationFromSelection(
      allPositions, twoMeasureRhythm, 12, 20
    );
    // ____ (tick 12-15) + S (tick 16) + T (tick 17) + K (tick 18) + T (tick 19)
    expect(result).toBe('____STKT');
  });

  it('should build notation for the second measure', () => {
    const result = buildNotationFromSelection(
      allPositions, twoMeasureRhythm, 16, 32
    );
    // STKTD---T---K---
    expect(result).toBe('STKTD---T---K---');
  });

  it('should return empty string for empty selection', () => {
    const result = buildNotationFromSelection(
      allPositions, twoMeasureRhythm, 100, 200
    );
    expect(result).toBe('');
  });

  it('should deduplicate ghost/repeat measure positions sharing same charPosition', () => {
    // Simulate ghost measure (repeat) where measure 2 maps to same charPositions as measure 0
    const ghostPositions: NotePosition[] = [
      ...measure0Positions,
      // Ghost positions (measure 2, same charPositions as measure 0)
      makePos(2, 0, 0, 2),
      makePos(2, 1, 2, 2),
      makePos(2, 2, 4, 1),
    ];

    // Create rhythm with 3 measures (third being a repeat of first)
    const rhythmWithRepeat: ParsedRhythm = {
      isValid: true,
      measures: [
        twoMeasureRhythm.measures[0],
        twoMeasureRhythm.measures[1],
        twoMeasureRhythm.measures[0], // Ghost/repeat
      ],
      error: undefined,
    };

    const result = buildNotationFromSelection(
      ghostPositions, rhythmWithRepeat, 0, 5
    );
    // Should not duplicate: D-__T (not D-__TD-__T)
    expect(result).toBe('D-__T');
  });

  it('should handle slap notes correctly', () => {
    const result = buildNotationFromSelection(
      allPositions, twoMeasureRhythm, 16, 17
    );
    expect(result).toBe('S');
  });

  it('should handle all note types in a single selection', () => {
    // Select from beginning through start of measure 2
    const result = buildNotationFromSelection(
      allPositions, twoMeasureRhythm, 0, 20
    );
    // D-__TKT-D---____ + STKT
    expect(result).toBe('D-__TKT-D---____STKT');
  });
});
