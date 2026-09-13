// @vitest-environment node
/**
 * Ordering is a product decision, not incidental: the palette reads as "same rhythm, different
 * voicing". `D-S-` was requested to sit with `D-D-` / `D-K-` rather than be appended, so these pin
 * the grouping that makes that true — an append would pass a "contains D-S-" check and still be
 * wrong.
 */
import { describe, expect, it } from 'vitest';
import { COMMON_PATTERNS } from './commonPatterns';

/** Rhythm structure alone: where the hits fall, ignoring which drum is struck. */
const structureOf = (pattern: string) =>
  [...pattern].map((c) => (c === '-' || c === '_' ? '.' : 'x')).join('');

describe('COMMON_PATTERNS', () => {
  it('includes the slap two-eighths pattern', () => {
    expect(COMMON_PATTERNS).toContain('D-S-');
  });

  it('keeps D-S- adjacent to the other two-eighths patterns', () => {
    const twoEighths = COMMON_PATTERNS.filter((p) => structureOf(p) === 'x.x.');
    expect(twoEighths).toEqual(['D-K-', 'D-D-', 'D-S-', 'T-K-']);
  });

  it('places every same-structure pattern in one contiguous run', () => {
    // The property the ordering exists for: no structure may reappear after a different one.
    const seen: string[] = [];
    for (const pattern of COMMON_PATTERNS) {
      const s = structureOf(pattern);
      if (seen[seen.length - 1] !== s) {
        expect(seen).not.toContain(s);
        seen.push(s);
      }
    }
  });

  it('has no duplicates', () => {
    expect(new Set(COMMON_PATTERNS).size).toBe(COMMON_PATTERNS.length);
  });

  it('uses only notation the parser understands', () => {
    for (const pattern of COMMON_PATTERNS) {
      expect(pattern).toMatch(/^[DTKS_-]+$/);
    }
  });
});
