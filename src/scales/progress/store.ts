import type { ScalesProgressData, ExerciseProgress, PracticeRecord } from './types';
import { TIERS, findExercise } from '../curriculum/tiers';
import type { ExerciseDefinition } from '../curriculum/types';

const STORAGE_KEY = 'scales-progress';
const MAX_HISTORY_PER_EXERCISE = 20;
// Raised from 0.85/2 to match RCM-style "3 clean runs in a row" gating and
// to keep advancement honest now that mastery is a two-tier concept
// (learning → fluent → mastered). See the scales-mastery rework plan.
const ADVANCEMENT_THRESHOLD = 0.90;
const ADVANCEMENT_RUNS = 3;
const REVIEW_ACCURACY_THRESHOLD = 0.7;
const STALE_DAYS = 5;

/**
 * Structured review entry returned from {@link getReviewExercises}. Includes
 * the specific stage to target on the next session — for shaky runs this is
 * the stage that scored low, for stale entries it's the stage the user
 * would naturally practice next.
 */
export interface ReviewEntry {
  exerciseId: string;
  stageId: string;
  reason: 'shaky' | 'stale';
}

function defaultProgress(): ScalesProgressData {
  return {
    version: 1,
    exercises: {},
    currentTierId: TIERS[0].id,
  };
}

export function loadProgress(): ScalesProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const data = JSON.parse(raw) as ScalesProgressData;
    if (data.version !== 1) return defaultProgress();
    return data;
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(data: ScalesProgressData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getExerciseProgress(
  data: ScalesProgressData,
  exerciseId: string,
): ExerciseProgress {
  if (data.exercises[exerciseId]) {
    return data.exercises[exerciseId];
  }
  const found = findExercise(exerciseId);
  const firstStageId = found?.exercise.stages[0]?.id ?? '';
  return {
    exerciseId,
    completedStageId: null,
    currentStageId: firstStageId,
    history: [],
    needsReview: false,
    reviewStageId: null,
    lastPracticedAt: null,
  };
}

/**
 * Whether an exercise has gone stale enough that a refresher is appropriate.
 * Only counts against exercises the user has actually completed at least
 * one stage of — otherwise "stale" would fire for keys the user has never
 * touched.
 */
export function isStale(progress: ExerciseProgress): boolean {
  if (!progress.lastPracticedAt || !progress.completedStageId) return false;
  const daysSince = (Date.now() - new Date(progress.lastPracticedAt).getTime()) /
    (1000 * 60 * 60 * 24);
  return daysSince > STALE_DAYS;
}

export type MasteryTier = 'learning' | 'fluent' | 'mastered';

/**
 * Compute the mastery tier for an exercise based on how far the learner
 * has progressed and whether the exercise is currently "live" (not shaky,
 * not stale). The result is derived on every render — nothing is stored —
 * so a shaky run or a long absence automatically demotes "Mastered" back
 * to "Fluent" without any write path, which keeps the invariant "Mastered
 * cannot coexist with Due for review" trivially true.
 *
 * Thresholds:
 *   - `learning` → user hasn't yet passed the designated fluent checkpoint
 *   - `fluent`   → passed the fluent checkpoint, OR passed the final stage
 *                  but currently shaky/stale (demoted from `mastered`)
 *   - `mastered` → passed the final stage AND not shaky AND not stale
 */
export function getMasteryTier(
  progress: ExerciseProgress,
  exercise: ExerciseDefinition,
): MasteryTier {
  const stages = exercise.stages;
  const completedIdx = progress.completedStageId
    ? stages.findIndex(s => s.id === progress.completedStageId)
    : -1;
  // Fluent checkpoint is wherever curriculum authors marked it. If no
  // stage is explicitly marked, fall back to the second-to-last stage,
  // treating the final stage as the mastery gate and everything before it
  // as fluent — better than hard-failing when curriculum is incomplete.
  const explicitFluentIdx = stages.findIndex(s => s.kind === 'fluent-checkpoint');
  const fluentIdx = explicitFluentIdx >= 0
    ? explicitFluentIdx
    : Math.max(0, stages.length - 2);
  const lastIdx = stages.length - 1;

  if (completedIdx < fluentIdx) return 'learning';
  if (completedIdx < lastIdx) return 'fluent';
  if (progress.needsReview || isStale(progress)) return 'fluent';
  return 'mastered';
}

/**
 * Record a practice result and evaluate whether the user should advance.
 */
export function recordPractice(
  data: ScalesProgressData,
  record: PracticeRecord,
): ScalesProgressData {
  const progress = getExerciseProgress(data, record.exerciseId);
  const updatedHistory = [record, ...progress.history].slice(0, MAX_HISTORY_PER_EXERCISE);

  const found = findExercise(record.exerciseId);
  let newCompletedStageId = progress.completedStageId;
  let newCurrentStageId = progress.currentStageId;

  if (found && record.stageId === progress.currentStageId) {
    const recentForStage = updatedHistory
      .filter(r => r.stageId === record.stageId)
      .slice(0, ADVANCEMENT_RUNS);

    const shouldAdvance =
      recentForStage.length >= ADVANCEMENT_RUNS &&
      recentForStage.every(r => r.accuracy >= ADVANCEMENT_THRESHOLD);

    if (shouldAdvance) {
      newCompletedStageId = record.stageId;
      const stages = found.exercise.stages;
      const currentIdx = stages.findIndex(s => s.id === record.stageId);
      if (currentIdx >= 0 && currentIdx < stages.length - 1) {
        newCurrentStageId = stages[currentIdx + 1].id;
      }
    }
  }

  // Review lifecycle:
  //   - A shaky run (<70%) sets the flag AND pins reviewStageId to the
  //     specific stage that struggled. This is what the review dialog
  //     shows the user and what the session planner serves next.
  //   - A non-shaky run on the previously flagged stage clears both — the
  //     user's refreshed it successfully. Runs on *other* stages leave the
  //     flag alone so the reminder sticks until the shaky stage itself is
  //     re-played.
  const isShaky = record.accuracy < REVIEW_ACCURACY_THRESHOLD;
  let needsReview: boolean;
  let reviewStageId: string | null;
  if (isShaky) {
    needsReview = true;
    reviewStageId = record.stageId;
  } else if (progress.reviewStageId && progress.reviewStageId === record.stageId) {
    needsReview = false;
    reviewStageId = null;
  } else {
    needsReview = progress.needsReview;
    reviewStageId = progress.reviewStageId;
  }

  const updatedProgress: ExerciseProgress = {
    ...progress,
    completedStageId: newCompletedStageId,
    currentStageId: newCurrentStageId,
    history: updatedHistory,
    needsReview,
    reviewStageId,
    lastPracticedAt: new Date(record.timestamp).toISOString(),
  };

  const newExercises = { ...data.exercises, [record.exerciseId]: updatedProgress };

  let newTierId = data.currentTierId;
  const currentTier = TIERS.find(t => t.id === data.currentTierId);
  if (currentTier) {
    const allComplete = currentTier.exercises.every(ex => {
      const ep = newExercises[ex.id];
      if (!ep) return false;
      const lastStage = ex.stages[ex.stages.length - 1];
      return ep.completedStageId === lastStage?.id;
    });
    if (allComplete) {
      const tierIdx = TIERS.findIndex(t => t.id === data.currentTierId);
      if (tierIdx >= 0 && tierIdx < TIERS.length - 1) {
        newTierId = TIERS[tierIdx + 1].id;
      }
    }
  }

  return {
    ...data,
    exercises: newExercises,
    currentTierId: newTierId,
  };
}

/**
 * Calculate proficiency score (0-1) with 7-day time decay.
 */
export function getExerciseProficiency(progress: ExerciseProgress): number {
  if (progress.history.length === 0) return 0;
  const now = Date.now();
  const DECAY_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

  let weightedSum = 0;
  let totalWeight = 0;
  for (const record of progress.history.slice(0, 10)) {
    const ageMs = now - record.timestamp;
    const weight = Math.pow(0.5, ageMs / DECAY_HALF_LIFE_MS);
    weightedSum += record.accuracy * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Get exercises that need review, tagged with the specific stage to serve
 * and the reason it was queued. Shaky entries point at the exact stage that
 * scored low; stale entries point at the stage the user would naturally
 * practice next (either the current stage or the last completed one as a
 * refresher).
 */
export function getReviewExercises(
  data: ScalesProgressData,
): ReviewEntry[] {
  const reviews: ReviewEntry[] = [];
  for (const [exerciseId, progress] of Object.entries(data.exercises)) {
    if (progress.needsReview && progress.reviewStageId) {
      reviews.push({
        exerciseId,
        stageId: progress.reviewStageId,
        reason: 'shaky',
      });
      continue;
    }
    if (progress.needsReview) {
      // Legacy records from before reviewStageId existed — fall back to the
      // stage the user was on so we still surface the flag.
      reviews.push({
        exerciseId,
        stageId: progress.currentStageId,
        reason: 'shaky',
      });
      continue;
    }
    if (isStale(progress)) {
      // Prefer the last-completed stage (a true refresher) over the
      // next-new stage — review should consolidate, not push into new
      // territory. Fall back to currentStageId if the user has never
      // completed anything (shouldn't happen because isStale requires a
      // completedStageId, but kept defensively).
      reviews.push({
        exerciseId,
        stageId: progress.completedStageId ?? progress.currentStageId,
        reason: 'stale',
      });
    }
  }
  return reviews;
}
