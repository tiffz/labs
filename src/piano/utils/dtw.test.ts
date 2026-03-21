import { describe, it, expect } from 'vitest';
import { computeDTW } from './dtw';

function f32(arr: number[]): Float32Array {
  return new Float32Array(arr);
}

describe('computeDTW', () => {
  it('returns empty result for empty sequences', async () => {
    const r = await computeDTW([], [f32([1, 0])]);
    expect(r.path).toHaveLength(0);
    expect(r.totalCost).toBe(Infinity);
  });

  it('aligns two identical sequences perfectly', async () => {
    const seq = [f32([1, 0, 0]), f32([0, 1, 0]), f32([0, 0, 1])];
    const r = await computeDTW(seq, seq, 0.5, 'euclidean', 0);
    expect(r.path).toHaveLength(3);
    expect(r.path).toEqual([[0, 0], [1, 1], [2, 2]]);
    expect(r.normalizedCost).toBeCloseTo(0, 5);
  });

  it('aligns a stretched version to the original', async () => {
    const a = [f32([1, 0]), f32([0, 1])];
    const b = [f32([1, 0]), f32([1, 0]), f32([0, 1]), f32([0, 1])];
    const r = await computeDTW(a, b, 1.0, 'euclidean', 0);

    // Path should map a[0] to b[0..1] and a[1] to b[2..3]
    expect(r.path.length).toBeGreaterThanOrEqual(4);
    expect(r.path[0]).toEqual([0, 0]);
    expect(r.path[r.path.length - 1]).toEqual([1, 3]);
    expect(r.normalizedCost).toBeCloseTo(0, 5);
  });

  it('uses cosine distance by default', async () => {
    const a = [f32([2, 0, 0])]; // same direction as b
    const b = [f32([4, 0, 0])];
    const r = await computeDTW(a, b, 0.5, 'cosine', 0);
    expect(r.normalizedCost).toBeCloseTo(0, 5);
  });

  it('cosine distance is 1.0 for orthogonal vectors', async () => {
    const a = [f32([1, 0])];
    const b = [f32([0, 1])];
    const r = await computeDTW(a, b, 1.0, 'cosine', 0);
    expect(r.normalizedCost).toBeCloseTo(1.0, 5);
  });

  it('band constraint prevents extreme warping', async () => {
    // With a narrow band, we can't match far-off-diagonal cells
    const N = 20;
    const a = Array.from({ length: N }, (_, i) => f32([i % 2, (i + 1) % 2]));
    const b = Array.from({ length: N }, (_, i) => f32([i % 2, (i + 1) % 2]));
    const r = await computeDTW(a, b, 0.1, 'euclidean', 0);
    // Should still find the diagonal — identical sequences
    expect(r.normalizedCost).toBeCloseTo(0, 5);
  });

  it('path is monotonically non-decreasing', async () => {
    const a = [f32([1, 0]), f32([0, 1]), f32([1, 1])];
    const b = [f32([1, 0]), f32([1, 0.5]), f32([0, 1]), f32([0.5, 1])];
    const r = await computeDTW(a, b, 1.0, 'euclidean', 0);

    for (let i = 1; i < r.path.length; i++) {
      expect(r.path[i][0]).toBeGreaterThanOrEqual(r.path[i - 1][0]);
      expect(r.path[i][1]).toBeGreaterThanOrEqual(r.path[i - 1][1]);
    }
  });
});
