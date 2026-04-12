import type { ScalesProgressData, ExerciseProgress, PracticeRecord } from './types';
import { TIERS, findExercise } from '../curriculum/tiers';

const STORAGE_KEY = 'scales-progress';
const MAX_HISTORY_PER_EXERCISE = 20;
const ADVANCEMENT_THRESHOLD = 0.85;
const ADVANCEMENT_RUNS = 2;

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
    lastPracticedAt: null,
  };
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

  const needsReview = record.accuracy < 0.7;

  const updatedProgress: ExerciseProgress = {
    ...progress,
    completedStageId: newCompletedStageId,
    currentStageId: newCurrentStageId,
    history: updatedHistory,
    needsReview,
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
 * Get exercises that need review (low recent scores or stale practice).
 */
export function getReviewExercises(
  data: ScalesProgressData,
): string[] {
  const reviews: string[] = [];
  for (const [exerciseId, progress] of Object.entries(data.exercises)) {
    if (progress.needsReview) {
      reviews.push(exerciseId);
      continue;
    }
    if (progress.lastPracticedAt) {
      const daysSince = (Date.now() - new Date(progress.lastPracticedAt).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSince > 5 && progress.completedStageId) {
        reviews.push(exerciseId);
      }
    }
  }
  return reviews;
}
