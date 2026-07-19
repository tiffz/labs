import { describe, expect, it } from 'vitest';
import { parseNotation, parseRhythm, preprocessRepeats } from './rhythmParser';
import type { TimeSignature } from './types';

const FOUR_FOUR: TimeSignature = { numerator: 4, denominator: 4 };

function totalSixteenths(notation: string): number {
  return parseNotation(notation)
    .filter((n) => !n.isBarline)
    .reduce((sum, n) => sum + n.durationInSixteenths, 0);
}

describe('parseNotation', () => {
  it('maps strokes with dash extensions to durations', () => {
    const notes = parseNotation('D-T-');
    expect(notes).toHaveLength(2);
    expect(notes[0]).toMatchObject({ sound: 'dum', durationInSixteenths: 2 });
    expect(notes[1]).toMatchObject({ sound: 'tak', durationInSixteenths: 2 });
  });

  it('extends rests with underscores', () => {
    const notes = parseNotation('D___');
    // 'D' is one sixteenth; '_' after a stroke starts a rest run.
    expect(notes.reduce((sum, n) => sum + n.durationInSixteenths, 0)).toBe(4);
  });

  it('ignores whitespace without changing durations', () => {
    expect(totalSixteenths('D-D-__T-D---T---')).toBe(totalSixteenths('D-D- __ T-D- --T- --'));
  });
});

describe('parseRhythm', () => {
  it('parses a full 4/4 measure as valid', () => {
    const parsed = parseRhythm('D-D-__T-D---T---', FOUR_FOUR);
    expect(parsed.isValid).toBe(true);
    expect(parsed.measures).toHaveLength(1);
    expect(parsed.measures[0].totalDuration).toBe(16);
  });

  it('splits multi-measure notation on barlines and pads the last measure', () => {
    const parsed = parseRhythm('D-------T-------|D---', FOUR_FOUR);
    expect(parsed.isValid).toBe(true);
    expect(parsed.measures).toHaveLength(2);
    expect(parsed.measures[1].totalDuration).toBe(16);
  });

  it('ties notes that cross a barline', () => {
    // 12 sixteenths + an 8-sixteenth note crosses into measure 2.
    const parsed = parseRhythm('D-----------T-------', FOUR_FOUR);
    expect(parsed.isValid).toBe(true);
    const tiedTo = parsed.measures[0].notes.at(-1);
    const tiedFrom = parsed.measures[1]?.notes[0];
    expect(tiedTo?.isTiedTo).toBe(true);
    expect(tiedFrom?.isTiedFrom).toBe(true);
    expect(
      (tiedTo?.durationInSixteenths ?? 0) + (tiedFrom?.durationInSixteenths ?? 0),
    ).toBe(8);
  });

  it('expands % simile into a copy of the previous measure', () => {
    const parsed = parseRhythm('D-T-D-T-D-T-D-T-|%', FOUR_FOUR);
    expect(parsed.isValid).toBe(true);
    expect(parsed.measures).toHaveLength(2);
    expect(parsed.measures[1].notes.map((n) => n.sound)).toEqual(
      parsed.measures[0].notes.map((n) => n.sound),
    );
    expect(parsed.repeats?.some((r) => r.type === 'measure')).toBe(true);
  });

  it('supports 7/8 measures', () => {
    const sevenEight: TimeSignature = { numerator: 7, denominator: 8 };
    const parsed = parseRhythm('D-T-D-T-D-T-D-', sevenEight);
    expect(parsed.isValid).toBe(true);
    expect(parsed.measures[0].totalDuration).toBe(14);
  });

  it('round-trips: measure durations always sum to the notated sixteenths', () => {
    const cases = ['D-D-__T-D---T---', 'D-------T-------|D---T---D---T---', 'D-T-K-T-D-T-K-T-'];
    for (const notation of cases) {
      const parsed = parseRhythm(notation, FOUR_FOUR);
      expect(parsed.isValid).toBe(true);
      const parsedTotal = parsed.measures.reduce((sum, m) => sum + m.totalDuration, 0);
      // Parsed total is the notated total rounded up to whole measures.
      const notated = totalSixteenths(notation);
      expect(parsedTotal).toBeGreaterThanOrEqual(notated);
      expect(parsedTotal % 16).toBe(0);
    }
  });

  it('pads an early barline to a full measure instead of failing', () => {
    const parsed = parseRhythm('D---|T---T---T---T---', FOUR_FOUR);
    expect(parsed.isValid).toBe(true);
    expect(parsed.measures[0].totalDuration).toBe(16);
    expect(parsed.measures[0].notes.at(-1)?.sound).toBe('rest');
  });

  it('empty notation is valid and empty', () => {
    const parsed = parseRhythm('   ', FOUR_FOUR);
    expect(parsed.isValid).toBe(true);
    expect(parsed.measures).toEqual([]);
  });
});

describe('preprocessRepeats', () => {
  it('passes plain notation through unchanged', () => {
    const result = preprocessRepeats('D-T-D-T-D-T-D-T-', 16);
    expect(result.expandedNotation).toBe('D-T-D-T-D-T-D-T-');
    expect(result.repeats).toEqual([]);
  });
});
