import { describe, expect, it } from 'vitest';
import { BULK_PERF_DEFAULT_SORTING, sortBulkPerfTableRows } from './bulkPerformanceImportTableSort';

const row = (id: string, name: string, date: string, modifiedTime?: string) => ({
  id,
  driveFileId: id,
  name,
  date,
  modifiedTime,
  guessedSongId: '',
  venue: '',
  skipRow: undefined,
});

describe('sortBulkPerfTableRows', () => {
  it('sorts by date descending by default config', () => {
    const a = row('1', 'a', '2024-01-01');
    const b = row('2', 'b', '2024-06-01');
    const out = sortBulkPerfTableRows([a, b], BULK_PERF_DEFAULT_SORTING);
    expect(out.map((r) => r.id)).toEqual(['2', '1']);
  });

  it('sorts by name ascending', () => {
    const z = row('z', 'Zebra', '2024-01-01');
    const m = row('m', 'Milo', '2024-01-01');
    const out = sortBulkPerfTableRows([z, m], [{ id: 'name', desc: false }]);
    expect(out.map((r) => r.name)).toEqual(['Milo', 'Zebra']);
  });
});
