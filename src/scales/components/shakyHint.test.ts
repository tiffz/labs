import { describe, expect, it } from 'vitest';
import { pickShakyHint } from './shakyHint';
import type { ExerciseResult } from '../store';
import type { Stage } from '../curriculum/types';

function makeStage(overrides: Partial<Stage> = {}): Stage {
  return {
    id: 'C-major-scale-s5',
    stageNumber: 5,
    label: 'Both hands, slow tempo',
    description: '',
    hand: 'both',
    useTempo: true,
    bpm: 60,
    useMetronome: true,
    subdivision: 'none',
    mutePlayback: false,
    octaves: 1,
    ...overrides,
  };
}

function makeResult(opts: {
  accuracy: number;
  total: number;
  perfect?: number;
  early?: number;
  late?: number;
  wrongPitch?: number;
  missed?: number;
  advanced?: boolean;
}): ExerciseResult {
  const perfect = opts.perfect ?? 0;
  const early = opts.early ?? 0;
  const late = opts.late ?? 0;
  const wrongPitch = opts.wrongPitch ?? 0;
  const missed = opts.missed ?? 0;
  return {
    accuracy: opts.accuracy,
    correct: perfect,
    total: opts.total,
    advanced: opts.advanced ?? false,
    breakdown: { perfect, early, late, wrongPitch, missed },
  };
}

describe('pickShakyHint', () => {
  it('returns null when accuracy is fluent', () => {
    const stage = makeStage();
    const result = makeResult({
      accuracy: 0.95,
      total: 16,
      perfect: 15,
      early: 1,
    });
    expect(pickShakyHint(result, stage)).toBeNull();
  });

  it('returns null when total is zero', () => {
    const stage = makeStage();
    const result = makeResult({ accuracy: 0, total: 0 });
    expect(pickShakyHint(result, stage)).toBeNull();
  });

  it('returns null on a mostly-clean run with only a slip or two', () => {
    const stage = makeStage({ useTempo: true, bpm: 72 });
    const result = makeResult({
      accuracy: 0.94,
      total: 16,
      perfect: 15,
      early: 1,
    });
    expect(pickShakyHint(result, stage)).toBeNull();
  });

  it('returns the timing branch when timing errors dominate on a tempo stage', () => {
    const stage = makeStage({ useTempo: true, bpm: 72 });
    const result = makeResult({
      accuracy: 0.7,
      total: 16,
      perfect: 11,
      early: 3,
      late: 1,
      wrongPitch: 1,
    });
    const hint = pickShakyHint(result, stage);
    expect(hint?.id).toBe('timing');
    expect(hint?.text).toMatch(/rhythm|click/i);
  });

  it('uses gentler timing copy when the metronome is already slow', () => {
    const stage = makeStage({ useTempo: true, bpm: 52 });
    const result = makeResult({
      accuracy: 0.7,
      total: 16,
      perfect: 11,
      early: 3,
      late: 1,
      wrongPitch: 1,
    });
    const hint = pickShakyHint(result, stage);
    expect(hint?.id).toBe('timing');
    expect(hint?.text).toMatch(/slow tempo|subdivide/i);
  });

  it('does NOT return the timing branch on a free-tempo stage even when timing errors are logged', () => {
    const stage = makeStage({ useTempo: false });
    const result = makeResult({
      accuracy: 0.5,
      total: 16,
      perfect: 8,
      early: 5,
      late: 0,
      wrongPitch: 2,
      missed: 1,
    });
    const hint = pickShakyHint(result, stage);
    expect(hint?.id).not.toBe('timing');
  });

  it('returns the pitch branch when wrong-pitch errors dominate', () => {
    const stage = makeStage();
    const result = makeResult({
      accuracy: 0.5,
      total: 16,
      perfect: 8,
      early: 1,
      wrongPitch: 6,
      missed: 1,
    });
    const hint = pickShakyHint(result, stage);
    expect(hint?.id).toBe('pitch');
    expect(hint?.text).toMatch(/wrong notes|hands-separately/i);
  });

  it('returns the few-notes branch when most notes were never attempted', () => {
    const stage = makeStage();
    const result = makeResult({
      accuracy: 0.2,
      total: 16,
      perfect: 3,
      missed: 12,
      wrongPitch: 1,
    });
    const hint = pickShakyHint(result, stage);
    expect(hint?.id).toBe('few-notes');
    expect(hint?.text).toMatch(/fragmented|reset/i);
  });

  it('falls back to the mixed/few-notes branch when timing and pitch are tied', () => {
    const stage = makeStage();
    const result = makeResult({
      accuracy: 0.6,
      total: 16,
      perfect: 10,
      early: 2,
      late: 0,
      wrongPitch: 2,
      missed: 2,
    });
    const hint = pickShakyHint(result, stage);
    expect(hint?.id).toBe('few-notes');
  });

  it('still hints when accuracy is exactly 0.89 (just below the fluent gate)', () => {
    const stage = makeStage();
    const result = makeResult({
      accuracy: 0.89,
      total: 100,
      perfect: 89,
      wrongPitch: 11,
    });
    expect(pickShakyHint(result, stage)).not.toBeNull();
  });

  it('returns null at exactly 0.9 (the fluent gate)', () => {
    const stage = makeStage();
    const result = makeResult({
      accuracy: 0.9,
      total: 100,
      perfect: 90,
      wrongPitch: 10,
    });
    expect(pickShakyHint(result, stage)).toBeNull();
  });
});
