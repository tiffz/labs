import { describe, it, expect } from 'vitest';
import { planSession } from './sessionPlanner';
import { findExercise } from './tiers';
import type { ScalesProgressData } from '../progress/types';

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

describe('planSession', () => {
  it('orders tier exercises by lastPracticedAt so the most recent resume slot is first', () => {
    const cId = 'C-pentascale-major';
    const gId = 'G-pentascale-major';
    const cStages = findExercise(cId)!.exercise.stages;
    const gStages = findExercise(gId)!.exercise.stages;
    const data: ScalesProgressData = {
      version: 3,
      currentTierId: 'tier-0',
      exercises: {
        [cId]: {
          exerciseId: cId,
          completedStageId: null,
          currentStageId: cStages[0].id,
          history: [],
          needsReview: false,
          reviewStageId: null,
          lastPracticedAt: iso(1_000_000),
        },
        [gId]: {
          exerciseId: gId,
          completedStageId: null,
          currentStageId: gStages[0].id,
          history: [],
          needsReview: false,
          reviewStageId: null,
          lastPracticedAt: iso(2_000_000),
        },
      },
      seenOnboarding: true,
      introducedConcepts: {},
      introducedExerciseHands: {},
    };

    const plan = planSession(data);
    expect(plan.exercises[0]?.exerciseId).toBe(gId);
    expect(plan.exercises.some(e => e.exerciseId === cId)).toBe(true);
  });
});
