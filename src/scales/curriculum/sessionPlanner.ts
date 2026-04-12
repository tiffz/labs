import type { SessionPlan, SessionExercise } from './types';
import { TIERS, findExercise } from './tiers';
import type { ScalesProgressData } from '../progress/types';
import { getExerciseProgress, getReviewExercises } from '../progress/store';

const MAX_SESSION_EXERCISES = 5;
const REVIEW_SLOTS = 1;

/**
 * Generate a practice session that balances new material with review.
 * The session planner picks exercises from the current tier that need
 * work, plus review exercises from previous tiers.
 */
export function planSession(data: ScalesProgressData): SessionPlan {
  const currentTier = TIERS.find(t => t.id === data.currentTierId) ?? TIERS[0];
  const newExercises: SessionExercise[] = [];

  for (const ex of currentTier.exercises) {
    if (newExercises.length >= MAX_SESSION_EXERCISES - REVIEW_SLOTS) break;
    const progress = getExerciseProgress(data, ex.id);
    const stage = ex.stages.find(s => s.id === progress.currentStageId) ?? ex.stages[0];
    if (!stage) continue;

    const lastStage = ex.stages[ex.stages.length - 1];
    if (progress.completedStageId === lastStage?.id) continue;

    newExercises.push({
      exerciseId: ex.id,
      stageId: stage.id,
      key: ex.key,
      kind: ex.kind,
      hand: stage.hand,
      bpm: stage.bpm,
      useMetronome: stage.useMetronome,
      subdivision: stage.subdivision,
      mutePlayback: stage.mutePlayback,
      purpose: 'new',
    });
  }

  const reviewIds = getReviewExercises(data);
  const reviewExercises: SessionExercise[] = [];
  for (const exerciseId of reviewIds) {
    if (reviewExercises.length >= REVIEW_SLOTS) break;
    if (newExercises.some(e => e.exerciseId === exerciseId)) continue;

    const found = findExercise(exerciseId);
    if (!found) continue;
    const progress = getExerciseProgress(data, exerciseId);

    const reviewStage = found.exercise.stages.find(s => s.id === progress.completedStageId)
      ?? found.exercise.stages[0];
    if (!reviewStage) continue;

    reviewExercises.push({
      exerciseId,
      stageId: reviewStage.id,
      key: found.exercise.key,
      kind: found.exercise.kind,
      hand: reviewStage.hand,
      bpm: reviewStage.bpm,
      useMetronome: reviewStage.useMetronome,
      subdivision: reviewStage.subdivision,
      mutePlayback: reviewStage.mutePlayback,
      purpose: 'review',
    });
  }

  const allExercises = [...newExercises, ...reviewExercises]
    .slice(0, MAX_SESSION_EXERCISES);

  if (allExercises.length === 0) {
    const firstExercise = TIERS[0].exercises[0];
    const firstStage = firstExercise.stages[0];
    allExercises.push({
      exerciseId: firstExercise.id,
      stageId: firstStage.id,
      key: firstExercise.key,
      kind: firstExercise.kind,
      hand: firstStage.hand,
      bpm: firstStage.bpm,
      useMetronome: firstStage.useMetronome,
      subdivision: firstStage.subdivision,
      mutePlayback: firstStage.mutePlayback,
      purpose: 'new',
    });
  }

  return {
    exercises: allExercises,
    generatedAt: Date.now(),
  };
}
