/**
 * Infer quarter-note BPM from inter-onset interval histograms.
 *
 * Drum loops and dense grooves often produce octave errors when autocorrelation
 * locks onto backbeats or half-measure pulses. Strong 8th-note IOI peaks (≈0.2s
 * at 150 BPM) are a reliable signal for the true quarter-note tempo.
 */

function buildIoiHistogram(
  iois: number[],
  minIoi: number,
  maxIoi: number,
  binWidth: number
): Map<number, number> {
  const histogram = new Map<number, number>();
  for (const ioi of iois) {
    if (ioi < minIoi || ioi > maxIoi) continue;
    const bin = Math.round(ioi / binWidth) * binWidth;
    histogram.set(bin, (histogram.get(bin) ?? 0) + 1);
  }
  return histogram;
}

function strongestQuarterBpmFromHistogram(
  histogram: Map<number, number>,
  toQuarterIoi: (ioi: number) => number
): { bpm: number; count: number } | null {
  let best: { bpm: number; count: number } | null = null;
  for (const [ioi, count] of histogram) {
    const quarterIoi = toQuarterIoi(ioi);
    if (quarterIoi <= 0) continue;
    const bpm = 60 / quarterIoi;
    if (bpm < 55 || bpm > 200) continue;
    if (!best || count > best.count) {
      best = { bpm, count };
    }
  }
  return best;
}

/**
 * Estimate quarter-note BPM from onset times using IOI histogram peaks.
 * Returns null when there is not enough evidence.
 */
export function inferQuarterNoteBpmFromOnsets(onsets: number[]): number | null {
  if (onsets.length < 20) return null;

  const sorted = [...onsets].sort((a, b) => a - b);
  const end = sorted[sorted.length - 1];
  const stable = sorted.filter((t) => t >= 5 && t <= Math.max(60, end - 5));
  if (stable.length < 20) return null;

  const iois: number[] = [];
  for (let i = 1; i < stable.length; i++) {
    const ioi = stable[i] - stable[i - 1];
    if (ioi >= 0.12 && ioi <= 1.2) iois.push(ioi);
  }
  if (iois.length < 12) return null;

  const eighthPeaks = buildIoiHistogram(iois, 0.15, 0.48, 0.02);
  const quarterPeaks = buildIoiHistogram(iois, 0.28, 1.05, 0.02);

  const fromEighths = strongestQuarterBpmFromHistogram(eighthPeaks, (ioi) => ioi * 2);
  const fromQuarters = strongestQuarterBpmFromHistogram(quarterPeaks, (ioi) => ioi);

  // Subdivision peaks often dominate the eighth histogram at ~2× the quarter tempo.
  if (
    fromEighths &&
    fromQuarters &&
    fromEighths.bpm / fromQuarters.bpm > 1.75 &&
    fromEighths.bpm / fromQuarters.bpm < 2.25 &&
    fromQuarters.count >= Math.max(8, fromEighths.count * 0.45)
  ) {
    return Math.round(fromQuarters.bpm * 100) / 100;
  }

  const candidates = [fromEighths, fromQuarters].filter(
    (item): item is { bpm: number; count: number } => item != null
  );
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.count - a.count);
  const top = candidates[0];
  const runnerUp = candidates[1];

  // Require a meaningful peak; when two agree within ~4%, average them.
  if (top.count < 8) return null;
  if (runnerUp && Math.abs(top.bpm - runnerUp.bpm) / top.bpm < 0.04) {
    return Math.round(((top.bpm + runnerUp.bpm) / 2) * 100) / 100;
  }
  return Math.round(top.bpm * 100) / 100;
}
