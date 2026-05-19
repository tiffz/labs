import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveSessionSnapshot,
  loadSessionSnapshot,
  clearSessionSnapshot,
  restoreSessionFromSnapshot,
  validateSessionSnapshot,
} from './scalesSessionSnapshot';
import { planSession } from '../curriculum/sessionPlanner';
import type { ScalesProgressData } from '../progress/types';
import { findExercise } from '../curriculum/tiers';

function freshProgress(): ScalesProgressData {
  const cId = 'C-pentascale-major';
  const stageId = findExercise(cId)!.exercise.stages[0].id;
  return {
    version: 3,
    currentTierId: 'tier-0',
    exercises: {
      [cId]: {
        exerciseId: cId,
        completedStageId: null,
        currentStageId: stageId,
        history: [],
        needsReview: false,
        reviewStageId: null,
        lastPracticedAt: null,
      },
    },
    seenOnboarding: true,
    introducedConcepts: {},
    introducedExerciseHands: {},
  };
}

describe('scalesSessionSnapshot', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips an in-progress session through localStorage', () => {
    const progress = freshProgress();
    const plan = planSession(progress);
    const activeExerciseIndex = Math.min(1, plan.exercises.length - 1);
    const activeExercise = plan.exercises[activeExerciseIndex]!;

    saveSessionSnapshot({
      sessionPlan: plan,
      activeExerciseIndex,
      activeExercise,
      sessionTierIdAtStart: progress.currentTierId,
    });

    const loaded = loadSessionSnapshot();
    expect(loaded?.activeExercise.exerciseId).toBe(activeExercise.exerciseId);
    expect(loaded?.activeExerciseIndex).toBe(activeExerciseIndex);

    const restored = restoreSessionFromSnapshot(progress);
    expect(restored?.activeExercise.stageId).toBe(activeExercise.stageId);
    expect(restored?.score).not.toBeNull();
  });

  it('clears invalid snapshots when the saved stage no longer exists', () => {
    const progress = freshProgress();
    const plan = planSession(progress);
    const activeExercise = { ...plan.exercises[0]!, stageId: 'removed-stage-id' };
    saveSessionSnapshot({
      sessionPlan: plan,
      activeExerciseIndex: 0,
      activeExercise,
      sessionTierIdAtStart: 'tier-0',
    });

    expect(restoreSessionFromSnapshot(progress)).toBeNull();
    expect(loadSessionSnapshot()).toBeNull();
  });

  it('validateSessionSnapshot rejects out-of-range indices', () => {
    const progress = freshProgress();
    const plan = planSession(progress);
    const snapshot = loadSessionSnapshot() ?? {
      version: 1 as const,
      sessionPlan: plan,
      activeExerciseIndex: 99,
      activeExercise: plan.exercises[0]!,
      sessionTierIdAtStart: 'tier-0',
      savedAt: Date.now(),
    };
    expect(validateSessionSnapshot(snapshot, progress)).toBe(false);
    clearSessionSnapshot();
  });
});
