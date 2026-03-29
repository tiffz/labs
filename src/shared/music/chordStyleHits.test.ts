import { describe, expect, it } from 'vitest';
import { getChordHitsForStyle } from './chordStyleHits';

describe('getChordHitsForStyle', () => {
  it('derives one-per-beat hits from shared styling patterns', () => {
    const hits = getChordHitsForStyle('one-per-beat', { numerator: 4, denominator: 4 });
    expect(hits.map((hit) => hit.offsetBeats)).toEqual([0, 1, 2, 3]);
    expect(hits.every((hit) => hit.durationBeats > 0)).toBe(true);
  });

  it('returns fallback whole-measure hit for unknown style', () => {
    const hits = getChordHitsForStyle('not-a-real-style', { numerator: 3, denominator: 4 });
    expect(hits).toEqual([{ offsetBeats: 0, source: 'both', durationBeats: 3 }]);
  });
});
