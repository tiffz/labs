import { describe, expect, it } from 'vitest';
import { clampScore, updateSkillMatrix, weakestSkillVector } from './skillMatrix';
import { defaultSkillMatrix } from './types';
import type { RepRecord } from './types';

function rep(partial: Partial<RepRecord> & Pick<RepRecord, 'passed' | 'skillVector'>): RepRecord {
  return {
    at: '2026-01-01T00:00:00.000Z',
    level: 1,
    module: 'flashcard',
    kind: 'flashcard-isolated',
    purpose: 'practice',
    tags: [],
    ...partial,
  };
}

describe('skillMatrix', () => {
  it('clamps scores to 0–100', () => {
    expect(clampScore(150)).toBe(100);
    expect(clampScore(-10)).toBe(0);
  });

  it('raises vector on pass and lowers on fail', () => {
    const base = defaultSkillMatrix(5);
    const up = updateSkillMatrix(base, rep({ passed: true, skillVector: 'valueSensation' }));
    expect(up.valueSensation).toBeGreaterThan(base.valueSensation);
    const down = updateSkillMatrix(up, rep({ passed: false, skillVector: 'valueSensation' }));
    expect(down.valueSensation).toBeLessThan(up.valueSensation);
  });

  it('picks weakest vector', () => {
    const matrix = {
      ...defaultSkillMatrix(10),
      chromaIsolation: 20,
    };
    expect(weakestSkillVector(matrix)).toBe('chromaIsolation');
  });
});
