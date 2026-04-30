import type { SessionPlan, SessionExercise } from './types';
import { TIERS, findExercise } from './tiers';
import type { ScalesProgressData } from '../progress/types';
import { getReviewExercises, getExerciseProgress } from '../progress/store';
import { isCurriculumExerciseUnlocked } from './exerciseUnlock';

const MAX_SESSION_EXERCISES = 5;
const REVIEW_SLOTS = 1;

export interface PlanSessionOptions {
  /**
   * When set, new-material slots are drawn from this tier's curriculum instead
   * of `currentTierId`. Ignored unless the tier exists and is at or below the
   * learner's current tier (cannot preview locked future tiers).
   */
  tierId?: string;
}

function sessionTierForPlanning(data: ScalesProgressData, options?: PlanSessionOptions) {
  const currentTierIdx = TIERS.findIndex(t => t.id === data.currentTierId);
  const safeCurrentIdx = currentTierIdx >= 0 ? currentTierIdx : 0;
  let targetIdx = safeCurrentIdx;
  if (options?.tierId != null) {
    const requested = TIERS.findIndex(t => t.id === options.tierId);
    if (requested >= 0 && requested <= safeCurrentIdx) {
      targetIdx = requested;
    }
  }
  return TIERS[targetIdx] ?? TIERS[0];
}

/**
 * Build a one-exercise plan at the user's current stage (or last stage if the
 * exercise is fully cleared) so the progress map / other entry points can jump
 * straight into practice.
 */
export function planSingleExerciseSession(
  data: ScalesProgressData,
  exerciseId: string,
): SessionPlan | null {
  if (!isCurriculumExerciseUnlocked(data, exerciseId)) return null;
  const found = findExercise(exerciseId);
  if (!found) return null;
  const ex = found.exercise;
  const ep = getExerciseProgress(data, ex.id);
  const stage = ex.stages.find(s => s.id === ep.currentStageId) ?? ex.stages[0];
  if (!stage) return null;
  return {
    exercises: [{
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
    }],
    generatedAt: Date.now(),
  };
}

/**
 * Generate a practice session that balances new material with review.
 * The session planner picks exercises from the current tier that need
 * work, plus review exercises from previous tiers.
 *
 * **Order:** unfinished slots follow **curriculum order within the tier**
 * (see `TIERS`), not `lastPracticedAt`, so e.g. Tier 1 majors stay C → G → F
 * until earlier keys are mastered. `lastPracticedAt` is only a tie-break when
 * comparing duplicate curriculum indices (should not occur).
 *
 * Pass {@link PlanSessionOptions.tierId} to rebuild a session from an earlier
 * tier the learner has already reached (remedial / review pass).
 *
 * New-material slots skip exercises that `isCurriculumExerciseUnlocked`
 * still gates (e.g. no G slot while C is still in progress), so the plan
 * does not list unreachable neighbors ahead of the learner.
 */
export function planSession(data: ScalesProgressData, options?: PlanSessionOptions): SessionPlan {
  const sessionTier = sessionTierForPlanning(data, options);
  type NewSlot = {
    exercise: SessionExercise;
    /** Index in `currentTier.exercises` — primary sort key so session order follows curriculum. */
    curriculumIndex: number;
    lastPlayed: string;
  };
  const candidateSlots: NewSlot[] = [];

  for (let curriculumIndex = 0; curriculumIndex < sessionTier.exercises.length; curriculumIndex++) {
    const ex = sessionTier.exercises[curriculumIndex];
    if (!isCurriculumExerciseUnlocked(data, ex.id)) continue;
    if (candidateSlots.length >= MAX_SESSION_EXERCISES - REVIEW_SLOTS) break;
    const progress = getExerciseProgress(data, ex.id);
    const stage = ex.stages.find(s => s.id === progress.currentStageId) ?? ex.stages[0];
    if (!stage) continue;

    const lastStage = ex.stages[ex.stages.length - 1];
    if (progress.completedStageId === lastStage?.id) continue;

    candidateSlots.push({
      exercise: {
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
      },
      curriculumIndex,
      // ISO timestamps sort lexicographically; used as tie-break only.
      lastPlayed: progress.lastPracticedAt ?? '1970-01-01T00:00:00.000Z',
    });
  }

  candidateSlots.sort((a, b) => {
    if (a.curriculumIndex !== b.curriculumIndex) {
      return a.curriculumIndex - b.curriculumIndex;
    }
    return b.lastPlayed.localeCompare(a.lastPlayed);
  });
  const newExercises = candidateSlots.map(s => s.exercise);

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
    const firstExercise = sessionTier.exercises[0] ?? TIERS[0].exercises[0];
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
