import type { SessionPlan, SessionExercise } from './types';
import { TIERS, findExercise } from './tiers';
import type { ScalesProgressData } from '../progress/types';
import { getReviewExercises, getExerciseProgress } from '../progress/store';

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
      octaves: stage.octaves,
      purpose: 'new',
    });
  }

  // Review slots now target the exact stage returned by getReviewExercises
  // — for shaky runs that's the stage that scored low, for stale entries
  // it's the last-completed stage as a refresher. Previously we always
  // pulled completedStageId, which could serve a different stage than the
  // one flagged in the review UI.
  const reviewEntries = getReviewExercises(data);
  const reviewExercises: SessionExercise[] = [];
  for (const entry of reviewEntries) {
    if (reviewExercises.length >= REVIEW_SLOTS) break;
    if (newExercises.some(e => e.exerciseId === entry.exerciseId)) continue;

    const found = findExercise(entry.exerciseId);
    if (!found) continue;

    const reviewStage = found.exercise.stages.find(s => s.id === entry.stageId)
      ?? found.exercise.stages.find(
        s => s.id === getExerciseProgress(data, entry.exerciseId).completedStageId,
      )
      ?? found.exercise.stages[0];
    if (!reviewStage) continue;

    reviewExercises.push({
      exerciseId: entry.exerciseId,
      stageId: reviewStage.id,
      key: found.exercise.key,
      kind: found.exercise.kind,
      hand: reviewStage.hand,
      bpm: reviewStage.bpm,
      useMetronome: reviewStage.useMetronome,
      subdivision: reviewStage.subdivision,
      mutePlayback: reviewStage.mutePlayback,
      octaves: reviewStage.octaves,
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
      octaves: firstStage.octaves,
      purpose: 'new',
    });
  }

  return {
    exercises: allExercises,
    generatedAt: Date.now(),
  };
}
