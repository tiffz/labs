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
        // 7.1% off: wrong, but close enough that the DETECTOR is the likely culprit, not the label.
        { label: 'Song C', detectedBpm: 130, groundTruthBpm: 140 },
        // 47% off and not an octave — the label is the likely culprit. Renders as LABEL?.
        { label: 'Song D', detectedBpm: 84, groundTruthBpm: 160 },
      ]),
    );
    expect(text).toContain('OK');
    expect(text).toContain('OCT');
    expect(text).toContain('MISS');
    expect(text).toContain('LABEL?');
    expect(text).toContain('Song B');
  });
});

describe('suspect ground truth', () => {
  it('flags the real White Flag case: badly off AND not an octave', () => {
    // Labelled 160 by tap; multifeature read 172.3 (= 2 x 86.15), percival 85.1, pipeline 84.
    // Three independent estimators clustered near 86 and a listen test confirmed ~86.
    const v = scoreTempoEstimate(84, 160);
    expect(v.accuracy1).toBe(false);
    expect(v.accuracy2).toBe(false);
    expect(v.suspectGroundTruth).toBe(true);
  });

  it('does NOT flag an octave error — that is the detector, not the label', () => {
    // Half-tempo is the classic detector failure and must stay a detector failure.
    const half = scoreTempoEstimate(75, 150);
    expect(half.accuracy2).toBe(true);
    expect(half.suspectGroundTruth).toBe(false);

    const double = scoreTempoEstimate(240, 120);
    expect(double.accuracy2).toBe(true);
    expect(double.suspectGroundTruth).toBe(false);
  });

  it('does NOT flag a near miss — that is the detector too', () => {
    // 8% flat is the sample-rate bug signature, not a bad label.
    const v = scoreTempoEstimate(110.3, 120);
    expect(v.accuracy1).toBe(false);
    expect(v.suspectGroundTruth).toBe(false);
  });

  it('counts suspect rows separately without excusing them', () => {
    const s = summarizeTempoEval([
      { label: 'ok', detectedBpm: 120, groundTruthBpm: 120 },
      { label: 'octave', detectedBpm: 60, groundTruthBpm: 120 },
      { label: 'bad label', detectedBpm: 84, groundTruthBpm: 160 },
    ]);
    expect(s.suspectGroundTruthCount).toBe(1);
    // The suspect row is still counted as a failure. Flagging is for humans, not a free pass —
    // an auto-excuse is how a benchmark stops being able to fail.
    expect(s.accuracy1Count).toBe(1);
    expect(s.accuracy2Count).toBe(2);
  });
});
