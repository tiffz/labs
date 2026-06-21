import { describe, expect, it } from 'vitest';
import type { ScalesProgressData } from '../progress/types';
import { mergeScalesProgress } from './scalesDriveMerge';

function baseProgress(overrides: Partial<ScalesProgressData> = {}): ScalesProgressData {
  return {
    version: 4,
    exercises: {},
    currentTierId: 'beginner',
    seenOnboarding: false,
    introducedConcepts: {},
    introducedExerciseHands: {},
    progressUpdatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('mergeScalesProgress', () => {
  const exerciseId = 'C-pentascale-major';
  const stageEarly = `${exerciseId}-p1`;
  const stageLate = `${exerciseId}-p5`;

  it('keeps rich local exercise when remote is sparse', () => {
    const local = baseProgress({
      progressUpdatedAt: '2026-02-01T00:00:00.000Z',
      exercises: {
        [exerciseId]: {
          exerciseId,
          completedStageId: stageEarly,
          currentStageId: stageLate,
          history: [{ exerciseId, stageId: stageEarly, timestamp: 1000, accuracy: 0.95, noteCount: 5, correctCount: 5 }],
          needsReview: false,
          reviewStageId: null,
          lastPracticedAt: '2026-02-01T00:00:00.000Z',
        },
      },
    });
    const remote = baseProgress({
      exercises: {
        [exerciseId]: {
          exerciseId,
          completedStageId: null,
          currentStageId: stageEarly,
          history: [],
          needsReview: false,
          reviewStageId: null,
          lastPracticedAt: null,
        },
      },
    });
    const { progress } = mergeScalesProgress(local, remote);
    expect(progress.exercises[exerciseId]?.currentStageId).toBe(stageLate);
    expect(progress.exercises[exerciseId]?.history).toHaveLength(1);
  });

  it('unions history by timestamp from both devices', () => {
    const local = baseProgress({
      exercises: {
        ex: {
          exerciseId: 'ex',
          completedStageId: null,
          currentStageId: 's1',
          history: [{ exerciseId: 'ex', stageId: 's1', timestamp: 2000, accuracy: 0.9, noteCount: 5, correctCount: 5 }],
          needsReview: false,
          reviewStageId: null,
          lastPracticedAt: null,
        },
      },
    });
    const remote = baseProgress({
      exercises: {
        ex: {
          exerciseId: 'ex',
          completedStageId: null,
          currentStageId: 's1',
          history: [{ exerciseId: 'ex', stageId: 's1', timestamp: 1000, accuracy: 0.8, noteCount: 5, correctCount: 4 }],
          needsReview: false,
          reviewStageId: null,
          lastPracticedAt: null,
        },
      },
    });
    const { progress } = mergeScalesProgress(local, remote);
    expect(progress.exercises.ex?.history.map((r) => r.timestamp)).toEqual([2000, 1000]);
  });

  it('normalizes unknown remote payload through migration pipeline', () => {
    const local = baseProgress();
    const remote = {
      version: 4,
      currentTierId: 'beginner',
      exercises: {},
      seenOnboarding: true,
    };
    const { progress } = mergeScalesProgress(local, remote);
    expect(progress.seenOnboarding).toBe(true);
    expect(progress.progressUpdatedAt).toBeTruthy();
  });
});
