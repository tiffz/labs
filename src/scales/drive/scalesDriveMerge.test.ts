import { describe, expect, it } from 'vitest';
import type { ExerciseProgress, ScalesProgressData } from '../progress/types';
import type { ScalesCustomRoutine } from '../curriculum/types';
import {
  applyScalesConflictChoices,
  mergeScalesProgress,
  scalesExerciseMergeWouldLoseContent,
} from './scalesDriveMerge';

function baseProgress(overrides: Partial<ScalesProgressData> = {}): ScalesProgressData {
  return {
    version: 5,
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
      version: 5,
      currentTierId: 'beginner',
      exercises: {},
      seenOnboarding: true,
    };
    const { progress } = mergeScalesProgress(local, remote);
    expect(progress.seenOnboarding).toBe(true);
    expect(progress.progressUpdatedAt).toBeTruthy();
  });
});

function exercise(
  exerciseId: string,
  overrides: Partial<ExerciseProgress> = {},
): ExerciseProgress {
  return {
    exerciseId,
    completedStageId: null,
    currentStageId: `${exerciseId}-p1`,
    history: [],
    needsReview: false,
    reviewStageId: null,
    lastPracticedAt: null,
    ...overrides,
  };
}

describe('scalesExerciseMergeWouldLoseContent (ADR 0020 dry run)', () => {
  const exerciseId = 'C-pentascale-major';
  const stageEarly = `${exerciseId}-p1`;
  const stageLate = `${exerciseId}-p5`;

  it('is safe for normal furthest-stage union', () => {
    expect(
      scalesExerciseMergeWouldLoseContent(
        exercise(exerciseId, { currentStageId: stageEarly }),
        exercise(exerciseId, { currentStageId: stageLate }),
      ),
    ).toBe(false);
  });

  it('flags a stage id that no longer resolves in the curriculum (would be dropped)', () => {
    expect(
      scalesExerciseMergeWouldLoseContent(
        exercise(exerciseId, { completedStageId: `${exerciseId}-removed-stage` }),
        exercise(exerciseId, { completedStageId: stageLate }),
      ),
    ).toBe(true);
  });
});

describe('applyScalesConflictChoices', () => {
  const exerciseId = 'C-pentascale-major';
  const stageEarly = `${exerciseId}-p1`;
  const stageLate = `${exerciseId}-p5`;
  const local = baseProgress({
    exercises: { [exerciseId]: exercise(exerciseId, { currentStageId: stageEarly }) },
  });
  const remote = baseProgress({
    exercises: { [exerciseId]: exercise(exerciseId, { currentStageId: stageLate }) },
  });

  it('keeps this device’s progress for choice=local', () => {
    const { progress } = applyScalesConflictChoices(local, remote, new Map([[exerciseId, 'local']]));
    expect(progress.exercises[exerciseId]?.currentStageId).toBe(stageEarly);
  });

  it('takes Drive’s progress for choice=remote', () => {
    const { progress } = applyScalesConflictChoices(local, remote, new Map([[exerciseId, 'remote']]));
    expect(progress.exercises[exerciseId]?.currentStageId).toBe(stageLate);
  });
});

describe('custom routine merge', () => {
  const routine = (id: string, name: string, updatedAt: string): ScalesCustomRoutine => ({
    id,
    name,
    updatedAt,
    items: [{ kind: 'major-scale', key: 'C', hand: 'both', octaves: 2, bpm: 72, subdivision: 'none' }],
  });

  it('unions routines from both sides by id', () => {
    const local = baseProgress({ customRoutines: [routine('a', 'A', '2026-01-01T00:00:00.000Z')] });
    const remote = baseProgress({ customRoutines: [routine('b', 'B', '2026-01-01T00:00:00.000Z')] });
    const { progress } = mergeScalesProgress(local, remote);
    expect((progress.customRoutines ?? []).map(r => r.id).sort()).toEqual(['a', 'b']);
  });

  it('resolves an edited routine by newer updatedAt (last writer wins)', () => {
    const local = baseProgress({ customRoutines: [routine('a', 'Old', '2026-01-01T00:00:00.000Z')] });
    const remote = baseProgress({ customRoutines: [routine('a', 'New', '2026-06-01T00:00:00.000Z')] });
    const { progress } = mergeScalesProgress(local, remote);
    expect(progress.customRoutines).toHaveLength(1);
    expect(progress.customRoutines?.[0].name).toBe('New');
  });

  it('keeps a local delete deleted when the remote still lists the routine', () => {
    const local = baseProgress({
      customRoutines: [],
      deletedRoutineIds: { a: '2026-06-01T00:00:00.000Z' },
    });
    const remote = baseProgress({ customRoutines: [routine('a', 'A', '2026-01-01T00:00:00.000Z')] });
    const { progress } = mergeScalesProgress(local, remote);
    expect(progress.customRoutines ?? []).toEqual([]);
    expect(progress.deletedRoutineIds?.a).toBe('2026-06-01T00:00:00.000Z');
  });

  it('a re-creation newer than the tombstone survives the merge', () => {
    const local = baseProgress({
      customRoutines: [],
      deletedRoutineIds: { a: '2026-06-01T00:00:00.000Z' },
    });
    const remote = baseProgress({ customRoutines: [routine('a', 'Reborn', '2026-09-01T00:00:00.000Z')] });
    const { progress } = mergeScalesProgress(local, remote);
    expect(progress.customRoutines?.map(r => r.id)).toEqual(['a']);
    expect(progress.deletedRoutineIds?.a).toBeUndefined();
  });

  it('preserves the device-local lastFreePracticeParams through a merge', () => {
    const local = baseProgress({
      lastFreePracticeParams: { kind: 'major-scale', key: 'Bb', hand: 'both', octaves: 2, bpm: 88, subdivision: 'none' },
    });
    const remote = baseProgress(); // stripped from the synced envelope, so never present remotely
    const { progress } = mergeScalesProgress(local, remote);
    expect(progress.lastFreePracticeParams?.key).toBe('Bb');
  });

  it('keeps device-local recents from the local side and ignores any remote recents', () => {
    const local = baseProgress({
      recentPracticeItems: [{ kind: 'major-scale', key: 'Bb', hand: 'both', octaves: 2, bpm: 72, subdivision: 'none' }],
    });
    // A stray remote recents (should never happen — stripped from the envelope) must not bleed in.
    const remote = baseProgress({
      recentPracticeItems: [{ kind: 'major-scale', key: 'F#', hand: 'both', octaves: 2, bpm: 72, subdivision: 'none' }],
    });
    const { progress } = mergeScalesProgress(local, remote);
    expect(progress.recentPracticeItems?.map(r => r.key)).toEqual(['Bb']);
  });
});
