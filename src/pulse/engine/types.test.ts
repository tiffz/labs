import { describe, it, expect } from 'vitest';
import { eighthBaseSlotsPerEighth, getSubdivisionOptions, getDefaultSubdivisionLevel } from './types';
import type { SubdivisionLevel } from './types';

describe('eighthBaseSlotsPerEighth', () => {
  it('returns 1 slot per eighth at level 1', () => {
    expect(eighthBaseSlotsPerEighth(1)).toBe(1);
  });

  it('returns 1 slot per eighth at level 2 (natural eighth-note pulse)', () => {
    expect(eighthBaseSlotsPerEighth(2)).toBe(1);
  });

  it('returns 2 slots per eighth at level 3 (sixteenth resolution)', () => {
    expect(eighthBaseSlotsPerEighth(3)).toBe(2);
  });

  it('returns 2 slots per eighth at level 4 (sixteenth resolution)', () => {
    expect(eighthBaseSlotsPerEighth(4)).toBe(2);
  });

  it('level 3 and level 4 produce different results from level 2', () => {
    const l2 = eighthBaseSlotsPerEighth(2);
    const l3 = eighthBaseSlotsPerEighth(3);
    const l4 = eighthBaseSlotsPerEighth(4);
    expect(l3).not.toBe(l2);
    expect(l4).not.toBe(l2);
  });

  it('handles all valid SubdivisionLevel values', () => {
    const levels: SubdivisionLevel[] = [1, 2, 3, 4];
    for (const level of levels) {
      const result = eighthBaseSlotsPerEighth(level);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(2);
    }
  });
});

describe('getSubdivisionOptions', () => {
  it('returns 4 options for /4 time signatures', () => {
    const options = getSubdivisionOptions({ numerator: 4, denominator: 4 });
    expect(options).toHaveLength(4);
    expect(options.map((o) => o.level)).toEqual([1, 2, 3, 4]);
  });

  it('returns 2 options for asymmetric /8 time signatures', () => {
    const options = getSubdivisionOptions({ numerator: 5, denominator: 8 });
    expect(options).toHaveLength(2);
    expect(options.map((o) => o.level)).toEqual([2, 4]);
    expect(options[1].label).toBe('÷2');
  });

  it('returns same 2 options for compound /8 (levels 2 and 4)', () => {
    const options = getSubdivisionOptions({ numerator: 12, denominator: 8 });
    expect(options).toHaveLength(2);
    expect(options.map((o) => o.level)).toEqual([2, 4]);
  });

  it('compound and asymmetric /8 get identical options', () => {
    const compound = getSubdivisionOptions({ numerator: 6, denominator: 8 });
    const asymmetric = getSubdivisionOptions({ numerator: 5, denominator: 8 });
    expect(compound).toEqual(asymmetric);
  });

  it('/4 options include a quarter note (level 1) option', () => {
    const options = getSubdivisionOptions({ numerator: 4, denominator: 4 });
    const quarter = options.find((o) => o.level === 1);
    expect(quarter).toBeDefined();
    expect(quarter!.iconLevel).toBe(1);
  });
});

describe('getDefaultSubdivisionLevel', () => {
  it('defaults to 2 for /4', () => {
    expect(getDefaultSubdivisionLevel({ numerator: 4, denominator: 4 })).toBe(2);
  });

  it('defaults to 2 for asymmetric /8', () => {
    expect(getDefaultSubdivisionLevel({ numerator: 5, denominator: 8 })).toBe(2);
  });

  it('defaults to 2 for compound /8', () => {
    expect(getDefaultSubdivisionLevel({ numerator: 12, denominator: 8 })).toBe(2);
  });
});
