/**
 * MIREX-style tempo accuracy metrics.
 *
 * Deliberately pure and detector-agnostic: it takes two numbers. The repo's previous accuracy
 * check, `bpmAccuracyTest.ts`, scored an estimate using the SAME onset detector that produced it,
 * so any self-consistent implementation scored well — including a wrong one. A metric that shares
 * machinery with the thing it measures cannot measure it.
 *
 * The distinction that matters here is Accuracy1 vs Accuracy2. Across this codebase's fixtures the
 * detector scores near-100% on Accuracy2 while Accuracy1 lags badly, which is the signature of an
 * OCTAVE problem — the tempo is right, the multiple is wrong — not a "can't find the beat"
 * problem. Those need different fixes, and a single pass/fail number hides which one you have.
 */

/** MIREX Accuracy1 tolerance: within 4% of ground truth. */
export const TEMPO_ACCURACY_1_TOLERANCE = 0.04;

/** Octave multiples Accuracy2 forgives (MIREX uses 1/3, 1/2, 1, 2, 3). */
export const TEMPO_ACCURACY_2_MULTIPLES = [1 / 3, 1 / 2, 1, 2, 3] as const;

export type TempoEvalVerdict = {
  /** Within 4% of ground truth. */
  accuracy1: boolean;
  /** Within 4% of ground truth times any of the forgiven multiples. */
  accuracy2: boolean;
  /** Which multiple matched under Accuracy2 (1 when exact), else null. */
  matchedMultiple: number | null;
  /** Signed relative error against ground truth, e.g. -0.081 for 8.1% flat. */
  relativeError: number;
};

export function scoreTempoEstimate(detectedBpm: number, groundTruthBpm: number): TempoEvalVerdict {
  const invalid =
    !Number.isFinite(detectedBpm) ||
    !Number.isFinite(groundTruthBpm) ||
    detectedBpm <= 0 ||
    groundTruthBpm <= 0;
  if (invalid) {
    return { accuracy1: false, accuracy2: false, matchedMultiple: null, relativeError: Number.NaN };
  }

  const relativeError = (detectedBpm - groundTruthBpm) / groundTruthBpm;
  const accuracy1 = Math.abs(relativeError) <= TEMPO_ACCURACY_1_TOLERANCE;

  let matchedMultiple: number | null = null;
  for (const multiple of TEMPO_ACCURACY_2_MULTIPLES) {
    const target = groundTruthBpm * multiple;
    if (Math.abs((detectedBpm - target) / target) <= TEMPO_ACCURACY_1_TOLERANCE) {
      matchedMultiple = multiple;
      break;
    }
  }

  return { accuracy1, accuracy2: matchedMultiple != null, matchedMultiple, relativeError };
}

export type TempoEvalCase = {
  label: string;
  detectedBpm: number;
  groundTruthBpm: number;
};

export type TempoEvalSummary = {
  total: number;
  accuracy1Count: number;
  accuracy2Count: number;
  /** 0–1. */
  accuracy1Rate: number;
  accuracy2Rate: number;
  /**
   * Cases correct only after octave forgiveness. A large number here means the fix is octave
   * selection, NOT the underlying tempo estimator — the single most useful signal in this report.
   */
  octaveOnlyCount: number;
  rows: (TempoEvalCase & TempoEvalVerdict)[];
};

export function summarizeTempoEval(cases: readonly TempoEvalCase[]): TempoEvalSummary {
  const rows = cases.map((c) => ({ ...c, ...scoreTempoEstimate(c.detectedBpm, c.groundTruthBpm) }));
  const accuracy1Count = rows.filter((r) => r.accuracy1).length;
  const accuracy2Count = rows.filter((r) => r.accuracy2).length;
  const total = rows.length;
  return {
    total,
    accuracy1Count,
    accuracy2Count,
    accuracy1Rate: total > 0 ? accuracy1Count / total : 0,
    accuracy2Rate: total > 0 ? accuracy2Count / total : 0,
    octaveOnlyCount: rows.filter((r) => !r.accuracy1 && r.accuracy2).length,
    rows,
  };
}

/** Plain-text report for pasting back into a chat or an issue. */
export function formatTempoEvalReport(summary: TempoEvalSummary): string {
  if (summary.total === 0) {
    return 'No ground-truth songs found (need a tap-sourced tempo calibration and local audio).';
  }
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const lines = [
    `Tempo detection vs tapped ground truth — ${summary.total} song(s)`,
    `  Accuracy1 (within 4%):      ${summary.accuracy1Count}/${summary.total}  ${pct(summary.accuracy1Rate)}`,
    `  Accuracy2 (octave-forgiving): ${summary.accuracy2Count}/${summary.total}  ${pct(summary.accuracy2Rate)}`,
    `  Octave-only errors:         ${summary.octaveOnlyCount}`,
    '',
  ];
  for (const r of summary.rows) {
    const verdict = r.accuracy1 ? 'OK   ' : r.accuracy2 ? `OCT x${r.matchedMultiple}` : 'MISS ';
    const err = Number.isFinite(r.relativeError) ? `${(r.relativeError * 100).toFixed(1)}%` : 'n/a';
    lines.push(
      `  ${verdict}  ${r.detectedBpm.toFixed(1)} vs ${r.groundTruthBpm.toFixed(1)} (${err})  ${r.label}`,
    );
  }
  return lines.join('\n');
}
