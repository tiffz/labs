import { describe, expect, it } from 'vitest';
import { findExercise } from './tiers';
import type { ScalesProgressData } from '../progress/types';
import {
  canAdvanceToNextInSessionPlan,
  findNextUnlockedSessionIndex,
  isCurriculumExerciseUnlocked,
  isSessionExerciseUnlocked,
} from './exerciseUnlock';
import type { SessionExercise } from './types';

const cMajorId = 'C-major-scale';
const gMajorId = 'G-major-scale';

function baseProgress(exercises: ScalesProgressData['exercises']): ScalesProgressData {
  return {
    version: 3,
    currentTierId: 'tier-1',
    exercises,
    seenOnboarding: true,
    introducedConcepts: {},
    introducedExerciseHands: {},
  };
}

describe('isCurriculumExerciseUnlocked', () => {
  it('allows the first exercise in a tier without prior progress', () => {
    const data = baseProgress({});
    expect(isCurriculumExerciseUnlocked(data, cMajorId)).toBe(true);
  });

  it('blocks the second tier exercise until the first is fully mastered', () => {
    const cStages = findExercise(cMajorId)!.exercise.stages;
    const gStages = findExercise(gMajorId)!.exercise.stages;
    const cFirst = cStages[0]!;
    const data = baseProgress({
      [cMajorId]: {
        exerciseId: cMajorId,
        completedStageId: cFirst.id,
        currentStageId: cStages[1]!.id,
        history: [],
        needsReview: false,
        reviewStageId: null,
        lastPracticedAt: null,
      },
      [gMajorId]: {
        exerciseId: gMajorId,
        completedStageId: null,
        currentStageId: gStages[0]!.id,
        history: [],
        needsReview: false,
        reviewStageId: null,
        lastPracticedAt: null,
      },
    });
    expect(isCurriculumExerciseUnlocked(data, gMajorId)).toBe(false);
    const cLast = cStages[cStages.length - 1]!;
    const dataMasteredC = baseProgress({
      [cMajorId]: {
        exerciseId: cMajorId,
        completedStageId: cLast.id,
        currentStageId: cLast.id,
        history: [],
        needsReview: false,
        reviewStageId: null,
        lastPracticedAt: null,
      },
    });
    expect(isCurriculumExerciseUnlocked(dataMasteredC, gMajorId)).toBe(true);
  });
});

describe('isSessionExerciseUnlocked', () => {
  it('always allows review purpose regardless of curriculum order', () => {
    const data = baseProgress({});
    const ex: SessionExercise = {
      exerciseId: gMajorId,
      stageId: 'x',
      key: 'G',
      kind: 'major-scale',
      hand: 'right',
      bpm: 60,
      useMetronome: true,
      subdivision: 'none',
      mutePlayback: false,
      octaves: 1,
      purpose: 'review',
    };
    expect(isSessionExerciseUnlocked(data, ex)).toBe(true);
  });
});

describe('canAdvanceToNextInSessionPlan', () => {
  it('is false when the following slot is a locked new exercise', () => {
    const cStages = findExercise(cMajorId)!.exercise.stages;
    const gStages = findExercise(gMajorId)!.exercise.stages;
    const plan = {
      exercises: [
      {
        exerciseId: cMajorId,
        stageId: cStages[0]!.id,
        key: 'C',
        kind: 'major-scale' as const,
        hand: 'right' as const,
        bpm: 0,
        useMetronome: false,
        subdivision: 'none' as const,
        mutePlayback: false,
        octaves: 1 as const,
        purpose: 'new' as const,
      },
      {
        exerciseId: gMajorId,
        stageId: gStages[0]!.id,
        key: 'G',
        kind: 'major-scale' as const,
        hand: 'right' as const,
        bpm: 0,
        useMetronome: false,
        subdivision: 'none' as const,
        mutePlayback: false,
        octaves: 1 as const,
        purpose: 'new' as const,
      },
      ],
    };
    const data = baseProgress({
      [cMajorId]: {
        exerciseId: cMajorId,
        completedStageId: null,
        currentStageId: cStages[0]!.id,
        history: [],
        needsReview: false,
        reviewStageId: null,
        lastPracticedAt: null,
      },
    });
    expect(findNextUnlockedSessionIndex(data, plan, 0)).toBe(null);
    expect(canAdvanceToNextInSessionPlan(data, plan, 0)).toBe(false);
  });
});

describe('findNextUnlockedSessionIndex', () => {
  it('skips a locked new slot to reach a later review slot', () => {
    const cStages = findExercise(cMajorId)!.exercise.stages;
    const gStages = findExercise(gMajorId)!.exercise.stages;
    const data = baseProgress({
      [cMajorId]: {
        exerciseId: cMajorId,
        completedStageId: null,
        currentStageId: cStages[0]!.id,
        history: [],
        needsReview: false,
        reviewStageId: null,
        lastPracticedAt: null,
      },
    });
    const plan = {
      exercises: [
        {
          exerciseId: cMajorId,
          stageId: cStages[0]!.id,
          key: 'C',
          kind: 'major-scale' as const,
          hand: 'right' as const,
          bpm: 0,
          useMetronome: false,
          subdivision: 'none' as const,
          mutePlayback: false,
          octaves: 1 as const,
          purpose: 'new' as const,
        },
        {
          exerciseId: gMajorId,
          stageId: gStages[0]!.id,
          key: 'G',
          kind: 'major-scale' as const,
          hand: 'right' as const,
          bpm: 0,
          useMetronome: false,
          subdivision: 'none' as const,
          mutePlayback: false,
          octaves: 1 as const,
          purpose: 'new' as const,
        },
        {
          exerciseId: gMajorId,
          stageId: gStages[0]!.id,
          key: 'G',
          kind: 'major-scale' as const,
          hand: 'right' as const,
          bpm: 0,
          useMetronome: false,
          subdivision: 'none' as const,
          mutePlayback: false,
          octaves: 1 as const,
          purpose: 'review' as const,
        },
      ],
    };
    expect(findNextUnlockedSessionIndex(data, plan, 0)).toBe(2);
    expect(canAdvanceToNextInSessionPlan(data, plan, 0)).toBe(true);
  });
});
