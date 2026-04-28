import { describe, expect, it } from 'vitest';
import type { PianoScore, ScoreNote, ScorePart } from '../scoreTypes';
import { decomposeDeficitToRests, normalizePianoScore } from './normalize';
import { pickMelodyPart } from './partUtils';

function singleMeasureScore(notes: ScoreNote[], num = 4, den = 4): PianoScore {
  const part: ScorePart = {
    id: 'p',
    name: 'P',
    clef: 'treble',
    hand: 'right',
    measures: [{ notes }],
  };
  return {
    id: 'auto-rest-test',
    title: 'auto-rest-test',
    key: 'C',
    timeSignature: { numerator: num, denominator: den },
    tempo: 60,
    parts: [part],
  };
}

describe('decomposeDeficitToRests', () => {
  it('returns greedy largest-first rest tokens', () => {
    expect(decomposeDeficitToRests(0)).toEqual([]);
    expect(decomposeDeficitToRests(1)).toEqual([
      { duration: 'quarter', dotted: false },
    ]);
    expect(decomposeDeficitToRests(3)).toEqual([
      { duration: 'half', dotted: true },
    ]);
    expect(decomposeDeficitToRests(3.5)).toEqual([
      { duration: 'half', dotted: true },
      { duration: 'eighth', dotted: false },
    ]);
    expect(decomposeDeficitToRests(4)).toEqual([
      { duration: 'whole', dotted: false },
    ]);
    expect(decomposeDeficitToRests(0.25)).toEqual([
      { duration: 'sixteenth', dotted: false },
    ]);
  });
});

describe('normalizePianoScore auto-rest filler', () => {
  it('marks manualReview and pads short measures with rests', () => {
    const score = singleMeasureScore([
      { id: 'n1', pitches: [60], duration: 'quarter' },
    ]);
    const out = normalizePianoScore(score, {
      id: 'short',
      sourceFile: 'short.xml',
      melodiaLevel: 1,
    });
    expect(out.manualReview).toBe(true);
    const part = pickMelodyPart(out.score);
    const measure = part.measures[0]!;
    const beats = measure.notes.reduce((s, n) => {
      const base = { whole: 4, half: 2, quarter: 1, eighth: 0.5, sixteenth: 0.25 }[n.duration];
      return s + (n.dotted ? base * 1.5 : base);
    }, 0);
    expect(beats).toBeCloseTo(4, 5);
    const restCount = measure.notes.filter((n) => n.rest).length;
    expect(restCount).toBeGreaterThan(0);
    const reportCodes = out.validation_report.map((f) => f.code);
    expect(reportCodes).toContain('measure_rhythm_mismatch');
  });

  it('does not mark manualReview when measures already balance', () => {
    const score = singleMeasureScore([
      { id: 'n1', pitches: [60], duration: 'whole' },
    ]);
    const out = normalizePianoScore(score, {
      id: 'full',
      sourceFile: 'full.xml',
      melodiaLevel: 1,
    });
    expect(out.manualReview).toBeUndefined();
  });

  it('preserves the original first note when padding', () => {
    const score = singleMeasureScore([
      { id: 'first', pitches: [60], duration: 'half' },
    ]);
    const out = normalizePianoScore(score, {
      id: 'half',
      sourceFile: 'half.xml',
      melodiaLevel: 1,
    });
    const part = pickMelodyPart(out.score);
    const first = part.measures[0]!.notes[0]!;
    expect(first.id).toBe('first');
    expect(first.pitches).toEqual([60]);
    expect(first.duration).toBe('half');
  });
});
