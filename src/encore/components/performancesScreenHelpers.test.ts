import { describe, expect, it } from 'vitest';
import type { EncorePerformance } from '../types';
import {
  formatPerformanceNotesLine,
  getPerfRowId,
  normalizePerfVenueLabel,
  normalizePerformancesTableSorting,
  performancesColumnOrderForMrt,
  perfMrtColumnId,
  type PerfMrtRow,
} from './performancesScreenHelpers';

function perfRow(partial: Partial<PerfMrtRow> & Pick<PerfMrtRow, 'perf' | 'song' | 'date' | 'songLabel' | 'artistLabel' | 'venue' | 'accompaniment'>): PerfMrtRow {
  return {
    perf: partial.perf,
    song: partial.song,
    date: partial.date,
    songLabel: partial.songLabel,
    artistLabel: partial.artistLabel,
    venue: partial.venue,
    accompaniment: partial.accompaniment,
  };
}

describe('normalizePerformancesTableSorting', () => {
  it('returns default newest-first date when undefined', () => {
    expect(normalizePerformancesTableSorting(undefined)).toEqual([{ id: 'date', desc: true }]);
  });

  it('replaces legacy songLabel ascending with default', () => {
    expect(normalizePerformancesTableSorting([{ id: 'songLabel', desc: false }])).toEqual([
      { id: 'date', desc: true },
    ]);
  });

  it('preserves non-legacy sorting', () => {
    const s = [{ id: 'venue', desc: false }];
    expect(normalizePerformancesTableSorting(s)).toEqual(s);
  });
});

describe('performancesColumnOrderForMrt', () => {
  const defaults = ['date', 'songLabel'];

  it('in table mode prepends select and ends with spacer', () => {
    const order = performancesColumnOrderForMrt('table', undefined, defaults);
    expect(order[0]).toBe('mrt-row-select');
    expect(order).toContain('mrt-row-actions');
    expect(order[order.length - 1]).toBe('mrt-row-spacer');
  });

  it('in grid mode omits row select from order', () => {
    const order = performancesColumnOrderForMrt('grid', undefined, defaults);
    expect(order).not.toContain('mrt-row-select');
  });
});

describe('perfMrtColumnId', () => {
  it('prefers id', () => {
    expect(perfMrtColumnId({ id: 'x', accessorKey: 'y' } as never)).toBe('x');
  });

  it('falls back to accessorKey string', () => {
    expect(perfMrtColumnId({ accessorKey: 'venue' } as never)).toBe('venue');
  });
});

describe('formatPerformanceNotesLine', () => {
  it('strips Imported: prefix', () => {
    expect(formatPerformanceNotesLine('  Imported: hello  ')).toBe('hello');
  });

  it('truncates long notes', () => {
    const long = 'a'.repeat(80);
    expect(formatPerformanceNotesLine(long, 10).length).toBeLessThanOrEqual(10);
    expect(formatPerformanceNotesLine(long, 10).endsWith('…')).toBe(true);
  });
});

describe('normalizePerfVenueLabel', () => {
  it('uses Venue for blank', () => {
    expect(normalizePerfVenueLabel('   ')).toBe('Venue');
  });

  it('trims', () => {
    expect(normalizePerfVenueLabel('  Club  ')).toBe('Club');
  });
});

describe('getPerfRowId', () => {
  it('returns performance id', () => {
    const p: EncorePerformance = {
      id: 'pid',
      songId: 's',
      date: '2024-01-01',
      venueTag: 'x',
      createdAt: '',
      updatedAt: '',
    };
    expect(
      getPerfRowId(
        perfRow({
          perf: p,
          song: null,
          date: '',
          songLabel: '',
          artistLabel: '',
          venue: '',
          accompaniment: [],
        }),
      ),
    ).toBe('pid');
  });
});
