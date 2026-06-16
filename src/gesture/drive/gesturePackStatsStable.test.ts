import { describe, expect, it } from 'vitest';
import { stabilizeGesturePackStatsAggregate } from './gesturePackStatsStable';

describe('stabilizeGesturePackStatsAggregate', () => {
  it('reuses prior aggregate when counts and covers are unchanged', () => {
    const prev = {
      counts: new Map([['a', 2]]),
      coverIds: new Map([['a', ['f1']]]),
      drawnSets: new Map([['a', new Set(['f1'])]]),
      packFileCount: 2,
      drawHistoryCount: 1,
    };
    const next = {
      counts: new Map([['a', 2]]),
      coverIds: new Map([['a', ['f1']]]),
      drawnSets: new Map([['a', new Set(['f1'])]]),
      packFileCount: 2,
      drawHistoryCount: 1,
    };
    expect(stabilizeGesturePackStatsAggregate(prev, next)).toBe(prev);
  });

  it('returns updated counts when pack file count changes', () => {
    const prev = {
      counts: new Map([['a', 2]]),
      coverIds: new Map(),
      drawnSets: new Map(),
      packFileCount: 2,
      drawHistoryCount: 0,
    };
    const next = {
      counts: new Map([['a', 3]]),
      coverIds: new Map(),
      drawnSets: new Map(),
      packFileCount: 3,
      drawHistoryCount: 0,
    };
    const result = stabilizeGesturePackStatsAggregate(prev, next);
    expect(result.counts.get('a')).toBe(3);
    expect(result.packFileCount).toBe(3);
    expect(result).not.toBe(prev);
  });
});
