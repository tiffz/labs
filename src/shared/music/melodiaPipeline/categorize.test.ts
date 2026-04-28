import { describe, expect, it } from 'vitest';
import type { PianoScore, ScoreNote, ScorePart } from '../scoreTypes';
import type { NormalizedMelodiaExercise } from './types';
import {
  bucketForMaxInterval,
  categorizeCorpus,
  maxMelodicIntervalSemitones,
} from './categorize';

function exercise(
  id: string,
  pitches: number[],
  opts: { manualReview?: boolean } = {},
): NormalizedMelodiaExercise {
  const notes: ScoreNote[] = pitches.map((p, i) => ({
    id: `${id}-n${i}`,
    pitches: [p],
    duration: 'quarter',
  }));
  const part: ScorePart = {
    id: 'voice',
    name: 'V',
    clef: 'treble',
    hand: 'voice',
    measures: [{ notes }],
  };
  const score: PianoScore = {
    id,
    title: id,
    key: 'C',
    timeSignature: { numerator: pitches.length || 1, denominator: 4 },
    tempo: 60,
    parts: [part],
  };
  return {
    id,
    sourceFile: `${id}.xml`,
    melodiaLevel: 1,
    measure_count: 1,
    rhythmic_profile: ['quarter'],
    pitch_sequence: pitches,
    hrmf: '',
    score,
    validation_report: [],
    ...(opts.manualReview ? { manualReview: true } : {}),
  };
}

describe('bucketForMaxInterval', () => {
  it('maps semitones to the right bucket', () => {
    expect(bucketForMaxInterval(0)).toBe('stepwise');
    expect(bucketForMaxInterval(1)).toBe('stepwise');
    expect(bucketForMaxInterval(2)).toBe('stepwise');
    expect(bucketForMaxInterval(3)).toBe('thirds');
    expect(bucketForMaxInterval(4)).toBe('thirds');
    expect(bucketForMaxInterval(5)).toBe('fourths');
    expect(bucketForMaxInterval(6)).toBe('mixed');
    expect(bucketForMaxInterval(12)).toBe('mixed');
  });
});

describe('maxMelodicIntervalSemitones', () => {
  it('uses absolute differences across consecutive sounded notes', () => {
    expect(maxMelodicIntervalSemitones(exercise('a', [60, 62, 64, 62]))).toBe(2);
    expect(maxMelodicIntervalSemitones(exercise('b', [60, 64, 60]))).toBe(4);
    expect(maxMelodicIntervalSemitones(exercise('c', [60, 65, 60]))).toBe(5);
    expect(maxMelodicIntervalSemitones(exercise('d', [60, 67, 60]))).toBe(7);
  });

  it('returns 0 for an empty melody', () => {
    expect(maxMelodicIntervalSemitones(exercise('e', []))).toBe(0);
  });
});

describe('categorizeCorpus', () => {
  it('orders exercises stepwise → thirds → fourths → mixed', () => {
    const out = categorizeCorpus([
      exercise('e1-mixed', [60, 67, 60]),
      exercise('e2-thirds', [60, 64, 62]),
      exercise('e3-step', [60, 62, 60]),
      exercise('e4-fourths', [60, 65, 60]),
    ]);
    expect(out.exerciseIds).toEqual([
      'e3-step',
      'e2-thirds',
      'e4-fourths',
      'e1-mixed',
    ]);
    expect(out.buckets.stepwise).toEqual(['e3-step']);
    expect(out.buckets.thirds).toEqual(['e2-thirds']);
    expect(out.buckets.fourths).toEqual(['e4-fourths']);
    expect(out.buckets.mixed).toEqual(['e1-mixed']);
  });

  it('excludes manualReview exercises from the linear path but keeps them in `categorized`', () => {
    const out = categorizeCorpus([
      exercise('clean', [60, 62, 64]),
      exercise('flagged', [60, 64, 60], { manualReview: true }),
    ]);
    expect(out.exerciseIds).toEqual(['clean']);
    expect(out.buckets.thirds).toEqual([]);
    expect(out.categorized).toHaveLength(2);
    expect(out.categorized.find((c) => c.id === 'flagged')?.manualReview).toBe(true);
  });

  it('preserves input order within a bucket', () => {
    const out = categorizeCorpus([
      exercise('s1', [60, 61]),
      exercise('s2', [64, 62]),
      exercise('s3', [62, 60]),
    ]);
    expect(out.exerciseIds).toEqual(['s1', 's2', 's3']);
  });
});
