import { describe, expect, it, beforeEach } from 'vitest';
import { buildSessionSummary, type SessionRunRecord } from './sessionRunSummary';
import { reducer, initialState } from './store';
import type { PracticeItem, ScalesCustomRoutine } from './curriculum/types';

const freeItem: PracticeItem = {
  kind: 'major-scale', key: 'Bb', hand: 'both', octaves: 2, bpm: 80, subdivision: 'none',
};

describe('free / routine session ladder isolation (reducer)', () => {
  beforeEach(() => localStorage.clear());

  it('FINISH_EXERCISE on a free session never writes progress.exercises', () => {
    let state = initialState();
    const exercisesBefore = state.progress.exercises;

    state = reducer(state, { type: 'START_FREE_PRACTICE', item: freeItem });
    expect(state.sessionPlan?.kind).toBe('free');
    expect(state.activeExercise?.exerciseId).toBe('free:major-scale:Bb');

    state = reducer(state, {
      type: 'FINISH_EXERCISE',
      exerciseId: state.activeExercise!.exerciseId,
      stageId: state.activeExercise!.stageId,
    });

    // The curriculum map is referentially untouched — no synthetic id, no
    // streak, no review flag could have been written.
    expect(state.progress.exercises).toBe(exercisesBefore);
    expect(Object.keys(state.progress.exercises)).not.toContain('free:major-scale:Bb');
  });

  it('COMPLETE_SESSION on a free session returns to plain home (no lesson framing)', () => {
    let state = initialState();
    state = reducer(state, { type: 'START_FREE_PRACTICE', item: freeItem });
    state = reducer(state, { type: 'COMPLETE_SESSION' });

    expect(state.screen).toBe('home');
    expect(state.sessionPlan).toBeNull();
    expect(state.sessionComplete).toBe(false);
    expect(state.lastSessionSummary).toBeNull();
    expect(state.progress.currentTierId).toBe(initialState().progress.currentTierId);
  });

  it('START_ROUTINE drops ungeneratable items and refuses to start an all-invalid routine', () => {
    let state = initialState();
    const routine: ScalesCustomRoutine = {
      id: 'r1', name: 'Mixed', updatedAt: '2026-01-01T00:00:00.000Z',
      items: [
        { kind: 'major-scale', key: 'C', hand: 'both', octaves: 2, bpm: 72, subdivision: 'none' },
        // structurally valid but ungeneratable in this build (bad key)
        { kind: 'major-scale', key: 'ZZ' as PracticeItem['key'], hand: 'both', octaves: 2, bpm: 72, subdivision: 'none' },
      ],
    };
    state = reducer(state, { type: 'START_ROUTINE', routine });
    expect(state.sessionPlan?.kind).toBe('routine');
    expect(state.sessionPlan?.exercises).toHaveLength(1); // ZZ dropped
    expect(state.sessionPlan?.exercises[0].exerciseId).toBe('free:major-scale:C');

    const allInvalid: ScalesCustomRoutine = {
      id: 'r2', name: 'Broken', updatedAt: '2026-01-01T00:00:00.000Z',
      items: [{ kind: 'major-scale', key: 'ZZ' as PracticeItem['key'], hand: 'both', octaves: 2, bpm: 72, subdivision: 'none' }],
    };
    localStorage.clear(); // drop the snapshot the mixed START_ROUTINE just saved
    const before = initialState();
    expect(before.sessionPlan).toBeNull(); // sanity: clean start
    const after = reducer(before, { type: 'START_ROUTINE', routine: allInvalid });
    expect(after).toBe(before); // no-op: did not open an empty session
    expect(after.sessionPlan).toBeNull();
  });
});

describe('buildSessionSummary', () => {
  it('returns an empty array for no runs', () => {
    expect(buildSessionSummary([])).toEqual([]);
  });

  it('marks an exercise as cleared when any normal run advanced the user', () => {
    const runs: SessionRunRecord[] = [
      { exerciseId: 'C-major-scale', stageId: 's1', accuracy: 0.7, advanced: false },
      { exerciseId: 'C-major-scale', stageId: 's1', accuracy: 0.95, advanced: true },
    ];
    const summary = buildSessionSummary(runs);
    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({
      exerciseId: 'C-major-scale',
      status: 'cleared',
      runs: 2,
    });
    expect(summary[0].bestAccuracy).toBeCloseTo(0.95);
  });

  it('marks an exercise as drilled when any run carried purpose=drill, even if it also advanced', () => {
    const runs: SessionRunRecord[] = [
      { exerciseId: 'C-major-scale', stageId: 's5', accuracy: 0.95, advanced: true },
      { exerciseId: 'C-major-scale', stageId: 's5', accuracy: 1, advanced: true, purpose: 'drill' },
    ];
    const summary = buildSessionSummary(runs);
    expect(summary).toHaveLength(1);
    expect(summary[0].status).toBe('drilled');
    expect(summary[0].bestAccuracy).toBe(1);
  });

  it('marks an exercise as shaky when no run advanced and no run was a drill', () => {
    const runs: SessionRunRecord[] = [
      { exerciseId: 'C-major-scale', stageId: 's3', accuracy: 0.7, advanced: false },
      { exerciseId: 'C-major-scale', stageId: 's3', accuracy: 0.85, advanced: false },
    ];
    const summary = buildSessionSummary(runs);
    expect(summary[0].status).toBe('shaky');
    expect(summary[0].bestAccuracy).toBeCloseTo(0.85);
  });

  it('preserves first-encountered order across exercises', () => {
    const runs: SessionRunRecord[] = [
      { exerciseId: 'C-major-scale', stageId: 's1', accuracy: 0.9, advanced: true },
      { exerciseId: 'G-major-scale', stageId: 's1', accuracy: 0.8, advanced: false },
      { exerciseId: 'C-major-scale', stageId: 's2', accuracy: 0.95, advanced: true },
      { exerciseId: 'F-major-scale', stageId: 's1', accuracy: 1, advanced: true },
    ];
    const summary = buildSessionSummary(runs);
    expect(summary.map(s => s.exerciseId)).toEqual([
      'C-major-scale',
      'G-major-scale',
      'F-major-scale',
    ]);
  });

  it('resolves the human-readable label from the curriculum', () => {
    const summary = buildSessionSummary([
      { exerciseId: 'C-major-scale', stageId: 's1', accuracy: 0.9, advanced: true },
    ]);
    expect(summary[0].exerciseLabel).toBe('C Major Scale');
  });

  it('falls back to the raw id for unknown exercises rather than throwing', () => {
    const summary = buildSessionSummary([
      { exerciseId: 'nonexistent-exercise', stageId: 's1', accuracy: 0.5, advanced: false },
    ]);
    expect(summary[0].exerciseLabel).toBe('nonexistent-exercise');
    expect(summary[0].status).toBe('shaky');
  });

  it('counts runs per exercise', () => {
    const runs: SessionRunRecord[] = [
      { exerciseId: 'C-major-scale', stageId: 's1', accuracy: 0.6, advanced: false },
      { exerciseId: 'C-major-scale', stageId: 's1', accuracy: 0.7, advanced: false },
      { exerciseId: 'C-major-scale', stageId: 's1', accuracy: 0.95, advanced: true },
    ];
    const summary = buildSessionSummary(runs);
    expect(summary[0].runs).toBe(3);
  });
});
