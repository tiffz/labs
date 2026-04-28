import { describe, expect, it } from 'vitest';
import type { PianoScore, ScorePart } from '../scoreTypes';
import { normalizePianoScore } from './normalize';
import type { NormalizedMelodiaExercise } from './types';
import {
  compareTwoNormalizations,
  detectIntervalOutliers,
  inferSuspiciousAccidentals,
  validateMeasureIntegrity,
} from './validators';

function scorePart(part: ScorePart, key: PianoScore['key'] = 'C'): PianoScore {
  return {
    id: 't',
    title: 'T',
    key,
    timeSignature: { numerator: 4, denominator: 4 },
    tempo: 60,
    parts: [part],
  };
}

describe('melodiaPipeline validators', () => {
  it('validateMeasureIntegrity passes full bar', () => {
    const part: ScorePart = {
      id: 'p',
      name: 'P',
      clef: 'treble',
      hand: 'right',
      measures: [
        { notes: [{ id: 'a', pitches: [60], duration: 'whole' }] },
      ],
    };
    const flags = validateMeasureIntegrity(scorePart(part), part);
    expect(flags.filter((f) => f.code === 'measure_rhythm_mismatch')).toHaveLength(0);
  });

  it('validateMeasureIntegrity flags short measure', () => {
    const part: ScorePart = {
      id: 'p',
      name: 'P',
      clef: 'treble',
      hand: 'right',
      measures: [
        { notes: [{ id: 'a', pitches: [60], duration: 'quarter' }] },
      ],
    };
    const flags = validateMeasureIntegrity(scorePart(part), part);
    expect(flags.some((f) => f.code === 'measure_rhythm_mismatch')).toBe(true);
  });

  it('detectIntervalOutliers flags large leap at level 1', () => {
    const part: ScorePart = {
      id: 'p',
      name: 'P',
      clef: 'treble',
      hand: 'right',
      measures: [
        {
          notes: [
            { id: 'a', pitches: [60], duration: 'quarter' },
            { id: 'b', pitches: [84], duration: 'quarter' },
          ],
        },
      ],
    };
    const flags = detectIntervalOutliers(part, 1);
    expect(flags.some((f) => f.code === 'interval_outlier')).toBe(true);
  });

  it('detectIntervalOutliers skips at level 2', () => {
    const part: ScorePart = {
      id: 'p',
      name: 'P',
      clef: 'treble',
      hand: 'right',
      measures: [
        {
          notes: [
            { id: 'a', pitches: [60], duration: 'quarter' },
            { id: 'b', pitches: [84], duration: 'quarter' },
          ],
        },
      ],
    };
    expect(detectIntervalOutliers(part, 2)).toHaveLength(0);
  });

  it('inferSuspiciousAccidentals flags non-diatonic in C major', () => {
    const part: ScorePart = {
      id: 'p',
      name: 'P',
      clef: 'treble',
      hand: 'right',
      measures: [
        { notes: [{ id: 'a', pitches: [61], duration: 'quarter' }] },
      ],
    };
    const flags = inferSuspiciousAccidentals(scorePart(part, 'C'), part);
    expect(flags.some((f) => f.code === 'suspicious_accidental')).toBe(true);
  });

  it('compareTwoNormalizations detects pitch mismatch', () => {
    const a: NormalizedMelodiaExercise = normalizePianoScore(
      scorePart({
        id: 'p',
        name: 'P',
        clef: 'treble',
        hand: 'right',
        measures: [{ notes: [{ id: 'a', pitches: [60], duration: 'quarter' }] }],
      }),
      { id: 'x', sourceFile: 'a.xml', melodiaLevel: 1 },
    );
    const b: NormalizedMelodiaExercise = normalizePianoScore(
      scorePart({
        id: 'p',
        name: 'P',
        clef: 'treble',
        hand: 'right',
        measures: [{ notes: [{ id: 'a', pitches: [62], duration: 'quarter' }] }],
      }),
      { id: 'x', sourceFile: 'b.xml', melodiaLevel: 1 },
    );
    const flags = compareTwoNormalizations(a, b);
    expect(flags.some((f) => f.code === 'normalization_mismatch')).toBe(true);
  });
});
