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
 * True if advancing from `activeIndex` to the following slot in `plan` is
 * allowed. Always true when there is no following slot (session end).
 */
export function canAdvanceToNextInSessionPlan(
  data: ScalesProgressData,
  plan: { exercises: SessionExercise[] } | null | undefined,
  activeIndex: number,
): boolean {
  if (!plan || plan.exercises.length === 0) return true;
  const nextIdx = activeIndex + 1;
  if (nextIdx >= plan.exercises.length) return true;
  return isSessionExerciseUnlocked(data, plan.exercises[nextIdx]!);
}
