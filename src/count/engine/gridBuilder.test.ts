import { describe, it, expect } from 'vitest';
import {
  buildSubdivisionGrid,
  type GridBuilderParams,
} from './gridBuilder';

function sampleIds(params: GridBuilderParams): string[] {
  return buildSubdivisionGrid(params).map((e) => e.sampleId);
}

function subdivTypes(params: GridBuilderParams): string[] {
  return buildSubdivisionGrid(params).map((e) => e.subdivision);
}

// ---------------------------------------------------------------------------
// buildSubdivisionGrid — simple /4 meters
// ---------------------------------------------------------------------------
describe('buildSubdivisionGrid — simple /4', () => {
  const base: GridBuilderParams = {
    timeSignature: { numerator: 4, denominator: 4 },
    grouping: [1, 1, 1, 1],
    voiceMode: 'counting',
    subdivisionLevel: 2,
    compound: false,
  };

  it('4/4 level 2: 8 slots (4 beats x 2 subdivisions)', () => {
    const grid = buildSubdivisionGrid(base);
    expect(grid).toHaveLength(8);
  });

  it('4/4 level 2 counting: beat-1, and, beat-2, and, ...', () => {
    const ids = sampleIds(base);
    expect(ids).toEqual([
      'beat-1', 'and',
      'beat-2', 'and',
      'beat-3', 'and',
      'beat-4', 'and',
    ]);
  });

  it('4/4 level 3: 12 slots', () => {
    const grid = buildSubdivisionGrid({ ...base, subdivisionLevel: 3 });
    expect(grid).toHaveLength(12);
  });

  it('4/4 level 3 counting: beat-N, and, uh, ...', () => {
    const ids = sampleIds({ ...base, subdivisionLevel: 3 });
    expect(ids).toEqual([
      'beat-1', 'and', 'uh',
      'beat-2', 'and', 'uh',
      'beat-3', 'and', 'uh',
      'beat-4', 'and', 'uh',
    ]);
  });

  it('4/4 level 4: 16 slots', () => {
    const grid = buildSubdivisionGrid({ ...base, subdivisionLevel: 4 });
    expect(grid).toHaveLength(16);
  });

  it('4/4 level 4 counting: beat-N, ee, and, uh, ...', () => {
    const ids = sampleIds({ ...base, subdivisionLevel: 4 });
    expect(ids).toEqual([
      'beat-1', 'ee', 'and', 'uh',
      'beat-2', 'ee', 'and', 'uh',
      'beat-3', 'ee', 'and', 'uh',
      'beat-4', 'ee', 'and', 'uh',
    ]);
  });

  it('4/4 level 2 takadimi: ta, di, ta, di, ...', () => {
    const ids = sampleIds({ ...base, voiceMode: 'takadimi' });
    expect(ids).toEqual([
      'ta', 'di', 'ta', 'di', 'ta', 'di', 'ta', 'di',
    ]);
  });

  it('4/4 level 4 takadimi: ta, ka, di, mi repeated', () => {
    const ids = sampleIds({ ...base, subdivisionLevel: 4, voiceMode: 'takadimi' });
    expect(ids).toEqual([
      'ta', 'ka', 'di', 'mi',
      'ta', 'ka', 'di', 'mi',
      'ta', 'ka', 'di', 'mi',
      'ta', 'ka', 'di', 'mi',
    ]);
  });

  it('4/4 level 3 takadimi: ta, ki, da repeated', () => {
    const ids = sampleIds({ ...base, subdivisionLevel: 3, voiceMode: 'takadimi' });
    expect(ids).toEqual([
      'ta', 'ki', 'da',
      'ta', 'ki', 'da',
      'ta', 'ki', 'da',
      'ta', 'ki', 'da',
    ]);
  });

  it('first entry has subdivision "accent"', () => {
    const grid = buildSubdivisionGrid(base);
    expect(grid[0].subdivision).toBe('accent');
  });

  it('subsequent beat starts have subdivision "quarter"', () => {
    const grid = buildSubdivisionGrid(base);
    expect(grid[2].subdivision).toBe('quarter');
    expect(grid[4].subdivision).toBe('quarter');
    expect(grid[6].subdivision).toBe('quarter');
  });

  it('3/4 level 2: 6 slots', () => {
    const grid = buildSubdivisionGrid({
      ...base,
      timeSignature: { numerator: 3, denominator: 4 },
      grouping: [1, 1, 1],
    });
    expect(grid).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// buildSubdivisionGrid — asymmetric /8 meters
// ---------------------------------------------------------------------------
describe('buildSubdivisionGrid — asymmetric /8', () => {
  const base58: GridBuilderParams = {
    timeSignature: { numerator: 5, denominator: 8 },
    grouping: [3, 2],
    voiceMode: 'counting',
    subdivisionLevel: 2,
    compound: false,
  };

  it('5/8 [3+2] level 2: 5 slots (one per eighth)', () => {
    const grid = buildSubdivisionGrid(base58);
    expect(grid).toHaveLength(5);
  });

  it('5/8 [3+2] level 3: 10 slots (two per eighth)', () => {
    const grid = buildSubdivisionGrid({ ...base58, subdivisionLevel: 3 });
    expect(grid).toHaveLength(10);
  });

  it('5/8 [3+2] level 4: 10 slots (two per eighth)', () => {
    const grid = buildSubdivisionGrid({ ...base58, subdivisionLevel: 4 });
    expect(grid).toHaveLength(10);
  });

  it('level 2 and level 3 produce different grid sizes for /8', () => {
    const l2 = buildSubdivisionGrid({ ...base58, subdivisionLevel: 2 });
    const l3 = buildSubdivisionGrid({ ...base58, subdivisionLevel: 3 });
    expect(l2.length).not.toBe(l3.length);
  });

  it('5/8 [3+2] level 2 counting: beat-1, and, uh, beat-2, and', () => {
    const ids = sampleIds(base58);
    expect(ids).toEqual(['beat-1', 'and', 'uh', 'beat-2', 'and']);
  });

  it('5/8 [3+2] level 2 takadimi: ta, ki, da, ta, di', () => {
    const ids = sampleIds({ ...base58, voiceMode: 'takadimi' });
    expect(ids).toEqual(['ta', 'ki', 'da', 'ta', 'di']);
  });

  it('5/8 [3+2] level 4 takadimi (÷2): L=6 → ta,ka,di,mi,ta,ka | L=4 → ta,ka,di,mi', () => {
    const ids = sampleIds({ ...base58, subdivisionLevel: 4, voiceMode: 'takadimi' });
    expect(ids).toHaveLength(10);
    expect(ids.slice(0, 6)).toEqual(['ta', 'ka', 'di', 'mi', 'ta', 'ka']);
    expect(ids.slice(6)).toEqual(['ta', 'ka', 'di', 'mi']);
  });

  it('5/8 [3+2] level 2: subdivisions are accent, eighth, eighth, quarter, eighth', () => {
    const types = subdivTypes(base58);
    expect(types).toEqual(['accent', 'eighth', 'eighth', 'quarter', 'eighth']);
  });

  it('7/8 [3+2+2] level 2: 7 slots', () => {
    const grid = buildSubdivisionGrid({
      ...base58,
      timeSignature: { numerator: 7, denominator: 8 },
      grouping: [3, 2, 2],
    });
    expect(grid).toHaveLength(7);
  });

  it('7/8 [3+2+2] level 2 counting: beat-1, and, uh, beat-2, and, beat-3, and', () => {
    const ids = sampleIds({
      ...base58,
      timeSignature: { numerator: 7, denominator: 8 },
      grouping: [3, 2, 2],
    });
    expect(ids).toEqual([
      'beat-1', 'and', 'uh',
      'beat-2', 'and',
      'beat-3', 'and',
    ]);
  });

  it('5/8 [3+2] level 4 (÷2): group of 3 → L=6, group of 2 → L=4', () => {
    const ids = sampleIds({ ...base58, subdivisionLevel: 4 });
    expect(ids).toHaveLength(10);
    expect(ids.slice(0, 6)).toEqual(['beat-1', 'ee', 'and', 'ee', 'and', 'uh']);
    expect(ids.slice(6)).toEqual(['beat-2', 'ee', 'and', 'uh']);
  });
});

// ---------------------------------------------------------------------------
// buildSubdivisionGrid — compound /8 (now uses same path as asymmetric)
// ---------------------------------------------------------------------------
describe('buildSubdivisionGrid — compound /8', () => {
  const base68: GridBuilderParams = {
    timeSignature: { numerator: 6, denominator: 8 },
    grouping: [3, 3],
    voiceMode: 'counting',
    subdivisionLevel: 2,
    compound: true,
  };

  it('6/8 level 2: 6 slots (2 groups × 3 eighths)', () => {
    const grid = buildSubdivisionGrid(base68);
    expect(grid).toHaveLength(6);
  });

  it('6/8 level 4 (÷2): 12 slots (2 groups × 6)', () => {
    const grid = buildSubdivisionGrid({ ...base68, subdivisionLevel: 4 });
    expect(grid).toHaveLength(12);
  });

  it('12/8 level 2: 12 slots (4 groups × 3)', () => {
    const grid = buildSubdivisionGrid({
      ...base68,
      timeSignature: { numerator: 12, denominator: 8 },
      grouping: [3, 3, 3, 3],
    });
    expect(grid).toHaveLength(12);
  });

  it('6/8 level 2 counting: beat-1, and, uh, beat-2, and, uh', () => {
    const ids = sampleIds(base68);
    expect(ids).toEqual(['beat-1', 'and', 'uh', 'beat-2', 'and', 'uh']);
  });

  it('6/8 level 4 counting (÷2): L=6 per group', () => {
    const ids = sampleIds({ ...base68, subdivisionLevel: 4 });
    expect(ids).toEqual([
      'beat-1', 'ee', 'and', 'ee', 'and', 'uh',
      'beat-2', 'ee', 'and', 'ee', 'and', 'uh',
    ]);
  });

  it('6/8 level 2 takadimi: ta, ki, da, ta, ki, da', () => {
    const ids = sampleIds({ ...base68, voiceMode: 'takadimi' });
    expect(ids).toEqual(['ta', 'ki', 'da', 'ta', 'ki', 'da']);
  });

  it('compound grid accent is only on first group', () => {
    const grid = buildSubdivisionGrid(base68);
    expect(grid[0].subdivision).toBe('accent');
    expect(grid[3].subdivision).toBe('quarter');
  });

  it('groupIndex is correct for compound meters', () => {
    const grid = buildSubdivisionGrid(base68);
    expect(grid[0].groupIndex).toBe(0);
    expect(grid[1].groupIndex).toBe(0);
    expect(grid[2].groupIndex).toBe(0);
    expect(grid[3].groupIndex).toBe(1);
    expect(grid[4].groupIndex).toBe(1);
    expect(grid[5].groupIndex).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Group start flags
// ---------------------------------------------------------------------------
describe('isGroupStart flags', () => {
  it('marks group starts correctly for 5/8 [3+2]', () => {
    const grid = buildSubdivisionGrid({
      timeSignature: { numerator: 5, denominator: 8 },
      grouping: [3, 2],
      voiceMode: 'counting',
      subdivisionLevel: 2,
      compound: false,
    });
    const groupStarts = grid.map((e) => e.isGroupStart);
    expect(groupStarts).toEqual([true, false, false, true, false]);
  });

  it('marks group starts correctly for 4/4 level 2', () => {
    const grid = buildSubdivisionGrid({
      timeSignature: { numerator: 4, denominator: 4 },
      grouping: [1, 1, 1, 1],
      voiceMode: 'counting',
      subdivisionLevel: 2,
      compound: false,
    });
    const groupStarts = grid.map((e) => e.isGroupStart);
    expect(groupStarts).toEqual([true, false, true, false, true, false, true, false]);
  });
});

// ---------------------------------------------------------------------------
// beatIndex is sequential
// ---------------------------------------------------------------------------
describe('beatIndex is sequential', () => {
  it('beatIndex increments from 0 for all grid entries', () => {
    const grid = buildSubdivisionGrid({
      timeSignature: { numerator: 7, denominator: 8 },
      grouping: [3, 2, 2],
      voiceMode: 'counting',
      subdivisionLevel: 2,
      compound: false,
    });
    const indices = grid.map((e) => e.beatIndex);
    expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});
