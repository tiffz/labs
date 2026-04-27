import type { ExerciseResult } from '../store';
import type { Stage } from '../curriculum/types';

/**
 * Adaptive coaching tip for a shaky run. Returned by `pickShakyHint`
 * when the latest run scored sub-fluent and the user could benefit from
 * a course correction before their next attempt.
 *
 * The `id` is stable so the caller can key React rendering against it
 * (and tests can match on identity rather than copy).
 */
export interface ShakyHint {
  id: 'timing' | 'pitch' | 'few-notes';
  text: string;
}

const SHAKY_ACCURACY_THRESHOLD = 0.9;
const FEW_NOTES_MISSED_RATIO = 0.5;

/**
 * Pick a contextual hint for the most-recently-completed run. Returns
 * null when:
 *  - The run was fluent (accuracy ≥ 0.9). No remedial advice needed.
 *  - The score was empty (total === 0).
 *
 * Branch logic:
 *  1. **few-notes**: more than half the notes were never attempted —
 *     usually means the user stopped early or lost the page. Suggest
 *     a clean restart with evenness as the goal.
 *  2. **timing** (only on tempo stages): timing errors (early + late)
 *     dominate and at least one was logged. Most misses were rhythmic,
 *     so dropping BPM is the targeted fix.
 *  3. **pitch**: pitch errors (wrong notes) dominate. Suggest hands-
 *     separate drilling at free tempo.
 *  4. **few-notes** (fallback): mixed/inconclusive. Default to the
 *     evenness-over-speed reset.
 */
export function pickShakyHint(
  result: ExerciseResult,
  stage: Stage,
): ShakyHint | null {
  if (result.total === 0) return null;
  if (result.accuracy >= SHAKY_ACCURACY_THRESHOLD) return null;

  const { breakdown, total } = result;
  const timing = breakdown.early + breakdown.late;
  const pitch = breakdown.wrongPitch;
  const missedMost = breakdown.missed > total * FEW_NOTES_MISSED_RATIO;

  if (missedMost) {
    return {
      id: 'few-notes',
      text: 'The run got away from you a bit. Restart and aim for evenness over speed.',
    };
  }

  if (timing > pitch && timing > 0 && stage.useTempo) {
    return {
      id: 'timing',
      text: 'Most of those misses were timing, not notes. Try one round 10 BPM slower before pushing again.',
    };
  }

  if (pitch > timing && pitch > 0) {
    return {
      id: 'pitch',
      text: 'Most of those misses were wrong notes. Drill the trouble spot hands-separately at free tempo for a minute.',
    };
  }

  return {
    id: 'few-notes',
    text: 'Mixed bag. Restart and aim for evenness over speed.',
  };
}
