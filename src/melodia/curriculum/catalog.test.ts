import { describe, expect, it } from 'vitest';
import { getMelodiaCatalog, getMelodiaExerciseById } from './catalog';

describe('melodia curriculum catalog', () => {
  it('loads seed exercises', () => {
    const c = getMelodiaCatalog();
    expect(c.length).toBeGreaterThanOrEqual(3);
  });

  it('getMelodiaExerciseById', () => {
    expect(getMelodiaExerciseById('melodia-b1-001')?.number).toBe(1);
  });
});
