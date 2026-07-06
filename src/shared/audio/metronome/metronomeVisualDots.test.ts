import { describe, expect, it } from 'vitest';
import {
  getMetronomeVisualDots,
  shouldClickAtVisualDot,
  metronomeDotRadiusPx,
} from './metronomeVisualDots';

describe('getMetronomeVisualDots', () => {
  it('4/4 level 1: quarter-beat positions', () => {
    const dots = getMetronomeVisualDots({ numerator: 4, denominator: 4 }, 1);
    expect(dots.map((d) => d.positionInSixteenths)).toEqual([0, 4, 8, 12]);
    expect(dots[0]?.tier).toBe('downbeat');
    expect(dots.slice(1).every((d) => d.tier === 'beat')).toBe(true);
  });

  it('4/4 level 2: eighth-note grid with subdivision tiers', () => {
    const dots = getMetronomeVisualDots({ numerator: 4, denominator: 4 }, 2);
    expect(dots.map((d) => d.positionInSixteenths)).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
    expect(dots.filter((d) => d.tier === 'subdivision')).toHaveLength(4);
  });

  it('4/4 level 3: triplet spacing per beat (not sixteenth-slot subsampling)', () => {
    const dots = getMetronomeVisualDots({ numerator: 4, denominator: 4 }, 3);
    expect(dots).toHaveLength(12);
    expect(dots[0]?.positionInSixteenths).toBeCloseTo(0, 5);
    expect(dots[1]?.positionInSixteenths).toBeCloseTo(4 / 3, 5);
    expect(dots[2]?.positionInSixteenths).toBeCloseTo(8 / 3, 5);
    expect(dots[3]?.positionInSixteenths).toBeCloseTo(4, 5);
  });

  it('4/4 level 4: full sixteenth grid', () => {
    const dots = getMetronomeVisualDots({ numerator: 4, denominator: 4 }, 4);
    expect(dots).toHaveLength(16);
    expect(dots.map((d) => d.positionInSixteenths)).toEqual(
      Array.from({ length: 16 }, (_, i) => i),
    );
  });

  it('3/4 level 2: six slots across the measure', () => {
    const dots = getMetronomeVisualDots({ numerator: 3, denominator: 4 }, 2);
    expect(dots.map((d) => d.positionInSixteenths)).toEqual([0, 2, 4, 6, 8, 10]);
  });
});

describe('shouldClickAtVisualDot', () => {
  it('level 1 clicks only downbeat and beat tiers', () => {
    const dots = getMetronomeVisualDots({ numerator: 4, denominator: 4 }, 2);
    const downbeat = dots.find((d) => d.tier === 'downbeat')!;
    const subdivision = dots.find((d) => d.tier === 'subdivision')!;
    expect(shouldClickAtVisualDot(downbeat, 1)).toBe(true);
    expect(shouldClickAtVisualDot(subdivision, 1)).toBe(false);
  });

  it('level 2+ clicks all non-silent dots', () => {
    const dots = getMetronomeVisualDots({ numerator: 4, denominator: 4 }, 2);
    expect(dots.every((d) => shouldClickAtVisualDot(d, 2))).toBe(true);
  });
});

describe('metronomeDotRadiusPx', () => {
  it('sizes sixteenth subdivisions smaller than eighth for breathing room', () => {
    expect(metronomeDotRadiusPx('subdivision', 'sixteenth')).toBe(1.85);
    expect(metronomeDotRadiusPx('subdivision', 'eighth')).toBe(2.25);
    expect(metronomeDotRadiusPx('subdivision', 'sixteenth')).toBeLessThan(
      metronomeDotRadiusPx('subdivision', 'eighth'),
    );
  });
});
