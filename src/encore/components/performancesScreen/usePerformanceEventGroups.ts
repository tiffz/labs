import { useMemo } from 'react';
import { performanceEventKey } from '../../performances/performanceEvents';
import type { PerfMrtRow } from '../performancesScreenHelpers';

export interface PerformanceEventGroup {
  key: string;
  /** ISO calendar day shared by every row in the group. */
  date: string;
  /** Venue as first seen, preserving the owner's casing. */
  venue: string;
  rows: PerfMrtRow[];
}

/**
 * Group already-filtered table rows into events — one date at one venue.
 *
 * Lives outside `PerformancesScreen` for the reason recorded in `usePerformancesColumns.tsx`: that
 * component sits at the React Compiler's bail threshold, where each added memo costs memoization on
 * unrelated pre-existing callbacks. Cheap enough (one pass over rows already in memory) that it
 * needs no cache ref — and a cache ref would itself cost a `react-hooks/refs` violation.
 *
 * Preserves input order, which is already date-desc from the caller.
 */
export function usePerformanceEventGroups(rows: PerfMrtRow[]): PerformanceEventGroup[] {
  return useMemo(() => {
    const byKey = new Map<string, PerformanceEventGroup>();
    for (const row of rows) {
      const key = performanceEventKey(row.perf);
      const existing = byKey.get(key);
      if (existing) {
        existing.rows.push(row);
        continue;
      }
      byKey.set(key, { key, date: row.date, venue: row.venue, rows: [row] });
    }
    return [...byKey.values()];
  }, [rows]);
}
