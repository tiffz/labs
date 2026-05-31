import { describe, expect, it } from 'vitest';
import { createSeededRandom, pickDeterministic } from './deterministicRandom';

describe('deterministicRandom', () => {
  it('createSeededRandom is stable for the same seed', () => {
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    const valuesA = Array.from({ length: 5 }, () => a());
    const valuesB = Array.from({ length: 5 }, () => b());
    expect(valuesA).toEqual(valuesB);
  });

  it('createSeededRandom differs across seeds', () => {
    const a = createSeededRandom(1);
    const b = createSeededRandom(2);
    expect(a()).not.toBe(b());
  });

  it('pickDeterministic cycles through items', () => {
    expect(pickDeterministic(['a', 'b', 'c'], 0)).toBe('a');
    expect(pickDeterministic(['a', 'b', 'c'], 4)).toBe('b');
  });
});
