/**
 * Shared tempo helper utilities.
 */

/**
 * Normalize BPM to a wide safe range (50-200) for comparison only.
 * This does NOT make octave decisions - it just ensures tempos are
 * in a comparable range for grouping or change detection.
 */
export function normalizeToRange(bpm: number, min: number = 50, max: number = 200): number {
  let normalized = bpm;
  while (normalized < min && normalized > 0) normalized *= 2;
  while (normalized > max) normalized /= 2;
  return normalized;
}
