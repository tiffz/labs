import { describe, expect, it } from 'vitest';
import { generateCompareChallenge } from './compare';

describe('generateCompareChallenge', () => {
  it('level 1 picks lighter or darker with clear lightness gap', () => {
    const c = generateCompareChallenge(100, 1);
    expect(c.kind).toBe('compare');
    expect(['lighter', 'darker']).toContain(c.axis);
    const gap = Math.abs(c.left.l - c.right.l);
    expect(gap).toBeGreaterThan(0.08);
    const correctL = c.correctSide === 'left' ? c.left.l : c.right.l;
    const otherL = c.correctSide === 'left' ? c.right.l : c.left.l;
    if (c.axis === 'lighter') expect(correctL).toBeGreaterThan(otherL);
    else expect(correctL).toBeLessThan(otherL);
  });

  it('level 2 uses saturation axes with chroma gap', () => {
    const c = generateCompareChallenge(200, 2);
    expect(['moreSaturated', 'lessSaturated']).toContain(c.axis);
    expect(Math.abs(c.left.c - c.right.c)).toBeGreaterThan(0.04);
  });

  it('level 3 can use cross-hue saturation with narrower chroma gap', () => {
    let sawCrossHue = false;
    let sawTightGap = false;
    for (let seed = 0; seed < 80; seed++) {
      const c = generateCompareChallenge(seed, 3);
      expect(['moreSaturated', 'lessSaturated']).toContain(c.axis);
      const hueGap = Math.abs(((c.left.h - c.right.h + 540) % 360) - 180);
      if (hueGap > 30) sawCrossHue = true;
      const chromaGap = Math.abs(c.left.c - c.right.c);
      if (chromaGap >= 0.025 && chromaGap < 0.06) sawTightGap = true;
      const correctC = c.correctSide === 'left' ? c.left.c : c.right.c;
      const otherC = c.correctSide === 'left' ? c.right.c : c.left.c;
      if (c.axis === 'moreSaturated') expect(correctC).toBeGreaterThanOrEqual(otherC);
      else expect(correctC).toBeLessThanOrEqual(otherC);
    }
    expect(sawCrossHue).toBe(true);
    expect(sawTightGap).toBe(true);
  });

  it('level 4 allows all compare axes', () => {
    const axes = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      axes.add(generateCompareChallenge(seed, 4).axis);
    }
    expect(axes.has('lighter')).toBe(true);
    expect(axes.has('darker')).toBe(true);
    expect(axes.has('moreSaturated')).toBe(true);
    expect(axes.has('lessSaturated')).toBe(true);
  });
});
