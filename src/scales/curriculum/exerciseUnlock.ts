import { findExercise } from './tiers';
import type { SessionExercise } from './types';
import type { ScalesProgressData } from '../progress/types';
import { getExerciseProgress } from '../progress/store';

/**
 * Within a tier, exercise index `k > 0` is available only after the previous
 * curriculum exercise is fully mastered (final stage cleared). This matches
 * ordered introduction (C before G before F in Tier 1, etc.).
 *
 * Review slots bypass this gate — they are intentional catch-up.
 */
export function isSessionExerciseUnlocked(
  data: ScalesProgressData,
  exercise: SessionExercise,
): boolean {
  if (exercise.purpose === 'review') return true;
  return isCurriculumExerciseUnlocked(data, exercise.exerciseId);
}

/**
 * Same ordering rule as {@link isSessionExerciseUnlocked} for `purpose: 'new'`
 * curriculum exercises (e.g. progress-map entry).
 */
export function isCurriculumExerciseUnlocked(data: ScalesProgressData, exerciseId: string): boolean {
  const found = findExercise(exerciseId);
  if (!found) return true;
  const { tier, exercise: exDef } = found;
  const idx = tier.exercises.findIndex((e) => e.id === exDef.id);
  if (idx <= 0) return true;
  const prevEx = tier.exercises[idx - 1]!;
  const prevProg = getExerciseProgress(data, prevEx.id);
  const lastStage = prevEx.stages[prevEx.stages.length - 1];
  if (!lastStage) return true;
  return prevProg.completedStageId === lastStage.id;
}

/**
 * Next session index after `activeIndex` that the learner may open, or
 * `null` if none (session complete from here). Skips curriculum-locked
 * `purpose: 'new'` slots so a plan like [C, G, …] does not trap Continue on
 * C when G is still gated on C's final stage.
 */
export function findNextUnlockedSessionIndex(
  data: ScalesProgressData,
  plan: { exercises: SessionExercise[] } | null | undefined,
  activeIndex: number,
): number | null {
  if (!plan || plan.exercises.length === 0) return null;
  for (let i = activeIndex + 1; i < plan.exercises.length; i++) {
    if (isSessionExerciseUnlocked(data, plan.exercises[i]!)) return i;
  }
  return null;
}

/**
 * True if there is any unlockable exercise after `activeIndex` in `plan`.
 * (Reaching the end of the list is handled by the session screen: Finish /
 * complete session.)
 */
export function canAdvanceToNextInSessionPlan(
  data: ScalesProgressData,
  plan: { exercises: SessionExercise[] } | null | undefined,
  activeIndex: number,
): boolean {
  return findNextUnlockedSessionIndex(data, plan, activeIndex) !== null;
}
