/**
 * Combine rhythmic delta (ms) and pitch cents into a single 0–100 precision score.
 */

export interface PrecisionSample {
  deltaMs: number;
  centsAbs: number;
}

const DEFAULT_RHYTHM_WINDOW_MS = 80;
const DEFAULT_CENTS_WINDOW = 45;

/**
 * Map mean absolute error to 0–100 (higher is better). Uses a smooth falloff.
 */
function qualityFromMeanError(mean: number, fullCreditUnder: number): number {
  if (mean <= 0) return 100;
  if (mean >= fullCreditUnder * 3) return 0;
  const t = mean / (fullCreditUnder * 3);
  return Math.round(100 * (1 - t * t));
}

export function computePrecisionScore(
  samples: PrecisionSample[],
  opts?: {
    rhythmFullCreditMs?: number;
    pitchFullCreditCents?: number;
    rhythmWeight?: number;
  },
): { score: number; rhythmScore: number; pitchScore: number; count: number } {
  const rhythmFull = opts?.rhythmFullCreditMs ?? DEFAULT_RHYTHM_WINDOW_MS;
  const pitchFull = opts?.pitchFullCreditCents ?? DEFAULT_CENTS_WINDOW;
  const wR = opts?.rhythmWeight ?? 0.55;

  if (samples.length === 0) {
    return { score: 0, rhythmScore: 0, pitchScore: 0, count: 0 };
  }

  const meanAbsMs = samples.reduce((a, s) => a + Math.abs(s.deltaMs), 0) / samples.length;
  const meanAbsCents = samples.reduce((a, s) => a + Math.abs(s.centsAbs), 0) / samples.length;

  const rhythmScore = qualityFromMeanError(meanAbsMs, rhythmFull);
  const pitchScore = qualityFromMeanError(meanAbsCents, pitchFull);
  const score = Math.round(wR * rhythmScore + (1 - wR) * pitchScore);

  return { score, rhythmScore, pitchScore, count: samples.length };
}
