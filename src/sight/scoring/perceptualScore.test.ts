import { describe, expect, it } from 'vitest';
import { calculatePerceptualScore } from './perceptualScore';

describe('calculatePerceptualScore', () => {
  it('passes identical colors at level 1 threshold', () => {
    const color = { h: 220, c: 0.08, l: 0.55 };
    const result = calculatePerceptualScore(color, color, 5.0);
    expect(result.pass).toBe(true);
    expect(result.deltaE).toBeLessThan(0.01);
    expect(result.accuracyRating).toBeGreaterThan(99);
  });

  it('fails clearly different hues at strict threshold', () => {
    const target = { h: 30, c: 0.12, l: 0.6 };
    const input = { h: 210, c: 0.12, l: 0.6 };
    const result = calculatePerceptualScore(target, input, 3.5);
    expect(result.pass).toBe(false);
    expect(result.deltaE).toBeGreaterThan(3.5);
  });

  it('respects per-level maxDeltaE', () => {
    const target = { h: 100, c: 0.05, l: 0.5 };
    const input = { h: 105, c: 0.06, l: 0.52 };
    const loose = calculatePerceptualScore(target, input, 5.0);
    const strict = calculatePerceptualScore(target, input, 1.0);
    expect(loose.deltaE).toBe(strict.deltaE);
    if (loose.deltaE > 1 && loose.deltaE < 5) {
      expect(loose.pass).toBe(true);
      expect(strict.pass).toBe(false);
    }
  });
});
