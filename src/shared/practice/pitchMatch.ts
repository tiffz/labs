/**
 * Pitch-class comparison and octave-offset detection for practice grading.
 *
 * These allow octave-flexible matching: the player can start in any octave
 * and be graded correctly as long as the intervals are preserved.
 */

/**
 * Minimum semitone distance between two pitch classes (0–6).
 * Returns 0 when both notes are the same pitch class regardless of octave.
 */
export function pitchClassDistance(a: number, b: number): number {
  const diff = Math.abs(((a % 12) + 12) % 12 - ((b % 12) + 12) % 12);
  return Math.min(diff, 12 - diff);
}

/**
 * Detect the octave offset (multiple of 12) between played and expected
 * pitches by matching pitch classes and averaging the deltas.
 * Returns null if no pitch-class match is found.
 */
export function deriveOctaveOffset(played: number[], expectedPitches: number[]): number | null {
  const deltas: number[] = [];
  for (const expected of expectedPitches) {
    for (const actual of played) {
      if (pitchClassDistance(actual, expected) === 0) {
        deltas.push(actual - expected);
      }
    }
  }
  if (deltas.length === 0) return null;
  const avgDelta = deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;
  return Math.round(avgDelta / 12) * 12;
}
