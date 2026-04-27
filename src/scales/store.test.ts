import { describe, expect, it } from 'vitest';
import { buildSessionSummary, type SessionRunRecord } from './store';

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
