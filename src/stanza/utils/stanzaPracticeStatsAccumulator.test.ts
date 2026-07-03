import { describe, expect, it } from 'vitest';
import { mergeStanzaPracticeStatsPatch } from './stanzaPracticeStatsAccumulator';

describe('mergeStanzaPracticeStatsPatch', () => {
  it('adds pending deltas to existing segment stats', () => {
    const stats = mergeStanzaPracticeStatsPatch(
      { segA: { totalMs: 1000, lastPracticed: 1 } },
      new Map([
        ['segA', 2000],
        ['segB', 500],
      ]),
      99,
    );
    expect(stats.segA).toEqual({ totalMs: 3000, lastPracticed: 99 });
    expect(stats.segB).toEqual({ totalMs: 500, lastPracticed: 99 });
  });

  it('returns the same object when pending is empty', () => {
    const existing = { segA: { totalMs: 1, lastPracticed: 1 } };
    expect(mergeStanzaPracticeStatsPatch(existing, new Map())).toBe(existing);
  });
});
