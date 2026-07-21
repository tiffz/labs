import { describe, expect, it } from 'vitest';
import { LEVEL_TABLE } from '../levels';
import type { HarmonySystem } from '../types';
import { generateAnchorPivotChallenge, hueDistance } from './anchorPivot';

/**
 * Content-integrity ratchet for the harmony (anchor-pivot) generator.
 *
 * The accuracy attribute has no compiler: a level labelled "Complementary
 * pivot" that silently emits a triadic system still type-checks, lints, and
 * renders. This test iterates the WHOLE reachable set — every curriculum level
 * whose module is `anchor-pivot`, across many seeds (hence many base hues) —
 * and asserts each generated system's hues carry the geometrically correct
 * angular relationship for the harmony it claims to teach.
 *
 * It fails on the pre-fix `level - 21` offset (level 23 produced triadic,
 * level 24 produced tetradic) and passes once each level maps to its label.
 */

// Canonical hue offsets (degrees from the base/pivot hue) that DEFINE each
// named harmony. These are the intended geometric definitions.
const CANONICAL_OFFSETS: Record<HarmonySystem, number[]> = {
  complementary: [0, 180], // two hues 180° apart
  splitComplementary: [0, 150, 210], // base + (180 ± 30)°
  triadic: [0, 120, 240], // three hues 120° apart
  tetradic: [0, 90, 180, 270], // four hues 90° apart (square)
};

// Harmony each curriculum level is allowed to teach, derived from its label in
// levels.ts. If a new anchor-pivot level ships, this map must be extended — the
// coverage assertion below fails until it is.
const EXPECTED_SYSTEMS_BY_LEVEL: Record<number, HarmonySystem[]> = {
  23: ['complementary'], // "Complementary pivot"
  24: ['splitComplementary', 'triadic'], // "Split & triadic pivot"
};

const TOLERANCE_DEG = 0.5;
const SEED_COUNT = 128;

const anchorPivotLevels = LEVEL_TABLE.filter((l) => l.module === 'anchor-pivot').map((l) => l.level);

/** Multiset of each hue's angular offset from the pivot, sorted ascending. */
function offsetsFromPivot(angles: number[], pivotHue: number): number[] {
  return angles.map((a) => ((a - pivotHue + 360) % 360)).sort((x, y) => x - y);
}

describe('anchor-pivot harmony generation — content integrity', () => {
  it('the curriculum actually reaches at least one harmony level', () => {
    expect(anchorPivotLevels.length).toBeGreaterThan(0);
  });

  it('every anchor-pivot level has a declared expected-systems entry', () => {
    // Forces this ratchet to be updated whenever a harmony level is added.
    expect([...anchorPivotLevels].sort((a, b) => a - b)).toEqual(
      Object.keys(EXPECTED_SYSTEMS_BY_LEVEL)
        .map(Number)
        .sort((a, b) => a - b),
    );
  });

  for (const level of anchorPivotLevels) {
    const expectedSystems = EXPECTED_SYSTEMS_BY_LEVEL[level] ?? [];
    const label = LEVEL_TABLE.find((l) => l.level === level)?.label ?? '';

    describe(`level ${level} — "${label}"`, () => {
      const challenges = Array.from({ length: SEED_COUNT }, (_, seed) =>
        generateAnchorPivotChallenge(seed, level),
      );

      it('only ever produces the harmonies its label teaches', () => {
        for (const ch of challenges) {
          expect(expectedSystems).toContain(ch.system);
        }
      });

      it('produces every harmony its label names (no silently dropped system)', () => {
        const produced = new Set(challenges.map((c) => c.system));
        for (const system of expectedSystems) {
          expect(produced).toContain(system);
        }
      });

      it('each generated hue set carries the correct angular relationship', () => {
        for (const ch of challenges) {
          const canonical = CANONICAL_OFFSETS[ch.system];

          // Correct number of hues for the claimed system.
          expect(ch.targetAngles).toHaveLength(canonical.length);

          // Every hue sits at a canonical offset from the pivot (within tol),
          // i.e. the produced geometry matches the harmony it claims to be.
          const offsets = offsetsFromPivot(ch.targetAngles, ch.pivotHue);
          offsets.forEach((offset, i) => {
            expect(Math.abs(offset - canonical[i]!)).toBeLessThanOrEqual(TOLERANCE_DEG);
          });

          // And the named-harmony invariant, asserted directly on the hues:
          if (ch.system === 'complementary') {
            expect(hueDistance(ch.targetAngles[0]!, ch.targetAngles[1]!)).toBeCloseTo(180, 1);
          }
          if (ch.system === 'triadic') {
            expect(hueDistance(ch.targetAngles[0]!, ch.targetAngles[1]!)).toBeCloseTo(120, 1);
            expect(hueDistance(ch.targetAngles[1]!, ch.targetAngles[2]!)).toBeCloseTo(120, 1);
            expect(hueDistance(ch.targetAngles[2]!, ch.targetAngles[0]!)).toBeCloseTo(120, 1);
          }
          if (ch.system === 'splitComplementary') {
            // The two satellites straddle the complement (180°) by ±30°.
            expect(hueDistance(ch.targetAngles[0]!, ch.targetAngles[1]!)).toBeCloseTo(150, 1);
            expect(hueDistance(ch.targetAngles[0]!, ch.targetAngles[2]!)).toBeCloseTo(150, 1);
            expect(hueDistance(ch.targetAngles[1]!, ch.targetAngles[2]!)).toBeCloseTo(60, 1);
          }
          if (ch.system === 'tetradic') {
            expect(hueDistance(ch.targetAngles[0]!, ch.targetAngles[2]!)).toBeCloseTo(180, 1);
            expect(hueDistance(ch.targetAngles[1]!, ch.targetAngles[3]!)).toBeCloseTo(180, 1);
          }
        }
      });
    });
  }
});

describe('canonical harmony definitions are geometrically sound', () => {
  it('complementary hues are 180° apart', () => {
    expect(CANONICAL_OFFSETS.complementary[1]! - CANONICAL_OFFSETS.complementary[0]!).toBe(180);
  });
  it('triadic hues are equally spaced at 120°', () => {
    expect(CANONICAL_OFFSETS.triadic).toEqual([0, 120, 240]);
  });
  it('split-complementary hues are base + (180 ± 30)°', () => {
    expect(CANONICAL_OFFSETS.splitComplementary).toEqual([0, 180 - 30, 180 + 30]);
  });
  it('tetradic (square) hues are 90° apart', () => {
    expect(CANONICAL_OFFSETS.tetradic).toEqual([0, 90, 180, 270]);
  });
});
