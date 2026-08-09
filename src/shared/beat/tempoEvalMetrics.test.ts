import { describe, expect, it } from 'vitest';
import {
  formatTempoEvalReport,
  scoreTempoEstimate,
  summarizeTempoEval,
} from './tempoEvalMetrics';

describe('scoreTempoEstimate', () => {
  it('accepts an exact match', () => {
    const v = scoreTempoEstimate(120, 120);
    expect(v.accuracy1).toBe(true);
    expect(v.accuracy2).toBe(true);
    expect(v.matchedMultiple).toBe(1);
  });

  it('accepts within 4% and rejects beyond it', () => {
    expect(scoreTempoEstimate(124.5, 120).accuracy1).toBe(true); // 3.75%
    expect(scoreTempoEstimate(125.5, 120).accuracy1).toBe(false); // 4.6%
  });

  it('flags a half-tempo reading as octave-only, not a miss', () => {
    // This is the dominant real failure: the tempo is right, the multiple is wrong.
    const v = scoreTempoEstimate(60, 120);
    expect(v.accuracy1).toBe(false);
    expect(v.accuracy2).toBe(true);
    expect(v.matchedMultiple).toBe(1 / 2);
  });

  it('flags a double-tempo reading as octave-only', () => {
    const v = scoreTempoEstimate(240, 120);
    expect(v.accuracy1).toBe(false);
    expect(v.accuracy2).toBe(true);
    expect(v.matchedMultiple).toBe(2);
  });

  it('rejects an unrelated tempo under both metrics', () => {
    const v = scoreTempoEstimate(97, 120);
    expect(v.accuracy1).toBe(false);
    expect(v.accuracy2).toBe(false);
    expect(v.matchedMultiple).toBeNull();
  });

  it('reports signed relative error', () => {
    // The 8% flat reading produced by decoding 48kHz audio as 44.1kHz.
    const v = scoreTempoEstimate(110.3, 120);
    expect(v.relativeError).toBeCloseTo(-0.0808, 3);
    expect(v.accuracy1).toBe(false);
  });

  it('treats invalid input as a miss rather than throwing', () => {
    expect(scoreTempoEstimate(Number.NaN, 120).accuracy1).toBe(false);
    expect(scoreTempoEstimate(0, 120).accuracy2).toBe(false);
    expect(scoreTempoEstimate(120, 0).accuracy2).toBe(false);
  });
});

describe('summarizeTempoEval', () => {
  it('separates octave-only errors from genuine misses', () => {
    const s = summarizeTempoEval([
      { label: 'exact', detectedBpm: 120, groundTruthBpm: 120 },
      { label: 'half', detectedBpm: 60, groundTruthBpm: 120 },
      { label: 'double', detectedBpm: 180, groundTruthBpm: 90 },
      { label: 'wrong', detectedBpm: 101, groundTruthBpm: 140 },
    ]);

    expect(s.total).toBe(4);
    expect(s.accuracy1Count).toBe(1);
    expect(s.accuracy2Count).toBe(3);
    // The number that tells you to fix octave selection rather than the estimator.
    expect(s.octaveOnlyCount).toBe(2);
  });

  it('handles an empty set without dividing by zero', () => {
    const s = summarizeTempoEval([]);
    expect(s.accuracy1Rate).toBe(0);
    expect(s.accuracy2Rate).toBe(0);
  });
});

describe('formatTempoEvalReport', () => {
  it('says so plainly when there is no ground truth', () => {
    expect(formatTempoEvalReport(summarizeTempoEval([]))).toContain('No ground-truth songs');
  });

  it('marks each row with its verdict', () => {
    const text = formatTempoEvalReport(
      summarizeTempoEval([
        { label: 'Song A', detectedBpm: 120, groundTruthBpm: 120 },
        { label: 'Song B', detectedBpm: 60, groundTruthBpm: 120 },
        { label: 'Song C', detectedBpm: 101, groundTruthBpm: 140 },
      ]),
    );
    expect(text).toContain('OK');
    expect(text).toContain('OCT');
    expect(text).toContain('MISS');
    expect(text).toContain('Song B');
  });
});
