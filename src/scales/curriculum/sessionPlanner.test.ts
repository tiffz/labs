import { describe, it, expect } from 'vitest';
import { planSession, planSingleExerciseSession } from './sessionPlanner';
import { findExercise } from './tiers';
import type { ScalesProgressData } from '../progress/types';

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

describe('planSession', () => {
  it('orders tier exercises by curriculum order (not lastPracticedAt)', () => {
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
    expect(plan.exercises[0]?.exerciseId).toBe(cId);
    expect(plan.exercises.some(e => e.exerciseId === gId)).toBe(true);
  });

  it('includes A pentascale catch-up slot when currentStage is appended spiral row', () => {
    const aId = 'A-pentascale-major';
    const aStages = findExercise(aId)!.exercise.stages;
    const p8 = aStages.find(s => s.id.endsWith('-p8'))!;
    const p7 = aStages.find(s => s.id.endsWith('-p7'))!;
    const done = (exerciseId: string) => {
      const last = findExercise(exerciseId)!.exercise.stages.at(-1)!.id;
      return {
        exerciseId,
        completedStageId: last,
        currentStageId: last,
        history: [],
        needsReview: false,
        reviewStageId: null,
        lastPracticedAt: iso(1_000_000),
      };
    };
    const data: ScalesProgressData = {
      version: 3,
      currentTierId: 'tier-0',
      exercises: {
        'C-pentascale-major': done('C-pentascale-major'),
        'G-pentascale-major': done('G-pentascale-major'),
        'F-pentascale-major': done('F-pentascale-major'),
        'D-pentascale-major': done('D-pentascale-major'),
        [aId]: {
          exerciseId: aId,
          completedStageId: p7.id,
          currentStageId: p8.id,
          history: [],
          needsReview: false,
          reviewStageId: null,
          lastPracticedAt: iso(3_000_000),
        },
      },
      seenOnboarding: true,
      introducedConcepts: {},
      introducedExerciseHands: {},
    };
    const plan = planSession(data);
    expect(plan.exercises.some(e => e.exerciseId === aId && e.stageId === p8.id)).toBe(true);
  });

  it('honors tierId override when revisiting an earlier tier from a higher current tier', () => {
    const cId = 'C-pentascale-major';
    const cStages = findExercise(cId)!.exercise.stages;
    const data: ScalesProgressData = {
      version: 3,
      currentTierId: 'tier-1',
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
      },
      seenOnboarding: true,
      introducedConcepts: {},
      introducedExerciseHands: {},
    };

    const defaultPlan = planSession(data);
    expect(defaultPlan.exercises.some(e => e.exerciseId === cId)).toBe(false);

    const tier0Plan = planSession(data, { tierId: 'tier-0' });
    expect(tier0Plan.exercises.some(e => e.exerciseId === cId)).toBe(true);
  });

  it('planSingleExerciseSession returns one slot for the requested exercise', () => {
    const cId = 'C-major-scale';
    const cStages = findExercise(cId)!.exercise.stages;
    const data: ScalesProgressData = {
      version: 3,
      currentTierId: 'tier-1',
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
      },
      seenOnboarding: true,
      introducedConcepts: {},
      introducedExerciseHands: {},
    };
    const plan = planSingleExerciseSession(data, cId);
    expect(plan).not.toBeNull();
    expect(plan!.exercises).toHaveLength(1);
    expect(plan!.exercises[0]?.exerciseId).toBe(cId);
    expect(plan!.exercises[0]?.stageId).toBe(cStages[0].id);
  });

  it('planSingleExerciseSession returns null when that exercise is not curriculum-unlocked yet', () => {
    const cId = 'C-major-scale';
    const gId = 'G-major-scale';
    const cStages = findExercise(cId)!.exercise.stages;
    const data: ScalesProgressData = {
      version: 3,
      currentTierId: 'tier-1',
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
      },
      seenOnboarding: true,
      introducedConcepts: {},
      introducedExerciseHands: {},
    };
    expect(planSingleExerciseSession(data, gId)).toBeNull();
  });
});
