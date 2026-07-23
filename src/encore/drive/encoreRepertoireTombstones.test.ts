import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { encoreDb } from '../db/encoreDb';
import {
  clearDeletedPerformanceIds,
  clearDeletedSongIds,
  filterTombstonedRows,
  parseTombstones,
  recordDeletedPerformanceIds,
  recordDeletedSongIds,
  unionDeletedRowIds,
} from './encoreRepertoireTombstones';

beforeEach(async () => {
  await encoreDb.repertoireExtras.clear();
});

async function extras() {
  return encoreDb.repertoireExtras.get('default');
}

describe('encoreRepertoireTombstones (clocked)', () => {
  it('records deleted song ids as an id -> deletedAt map', async () => {
    await recordDeletedSongIds(['s1', 's2']);
    const map = (await extras())?.deletedSongIds;
    expect(Object.keys(map ?? {}).sort()).toEqual(['s1', 's2']);
    expect(typeof map?.s1).toBe('string'); // ISO deletedAt
  });

  it('records performances separately from songs', async () => {
    await recordDeletedPerformanceIds(['p1']);
    const row = await extras();
    expect(Object.keys(row?.deletedPerformanceIds ?? {})).toEqual(['p1']);
    expect(row?.deletedSongIds).toBeUndefined();
  });

  it('clears a tombstone when the row is restored (undo)', async () => {
    await recordDeletedSongIds(['s1', 's2']);
    await clearDeletedSongIds(['s1']);
    expect(Object.keys((await extras())?.deletedSongIds ?? {})).toEqual(['s2']);
  });

  it('drops the field entirely when the last tombstone is cleared', async () => {
    await recordDeletedPerformanceIds(['p1']);
    await clearDeletedPerformanceIds(['p1']);
    expect((await extras())?.deletedPerformanceIds).toBeUndefined();
  });

  it('does not bump updatedAt when nothing changes (no needless push)', async () => {
    await recordDeletedSongIds(['s1']);
    const first = (await extras())?.updatedAt;
    await clearDeletedSongIds(['not-present']); // no-op
    expect((await extras())?.updatedAt).toBe(first);
  });

  it('ignores blank ids', async () => {
    await recordDeletedSongIds(['', '  ']);
    expect(await extras()).toBeUndefined();
  });

  describe('unionDeletedRowIds', () => {
    it('keeps the latest deletedAt per id', () => {
      const merged = unionDeletedRowIds(
        { s1: '2025-01-02T00:00:00.000Z', s2: '2025-01-01T00:00:00.000Z' },
        { s1: '2025-06-01T00:00:00.000Z' },
      );
      expect(merged?.s1).toBe('2025-06-01T00:00:00.000Z'); // newer wins
      expect(merged?.s2).toBe('2025-01-01T00:00:00.000Z');
    });
    it('returns undefined when both empty', () => {
      expect(unionDeletedRowIds(undefined, undefined)).toBeUndefined();
    });
  });

  describe('filterTombstonedRows (clock supersede — B1)', () => {
    const tomb = { s1: '2025-03-01T00:00:00.000Z' };
    it('drops a row whose updatedAt is at or before its tombstone', () => {
      const rows = [{ id: 's1', updatedAt: '2025-02-01T00:00:00.000Z' }];
      expect(filterTombstonedRows(rows, tomb)).toEqual([]);
    });
    it('KEEPS a row restored/re-edited after its tombstone (undo survives)', () => {
      const rows = [{ id: 's1', updatedAt: '2025-06-01T00:00:00.000Z' }];
      expect(filterTombstonedRows(rows, tomb)).toEqual(rows);
    });
    it('keeps untombstoned rows', () => {
      const rows = [{ id: 's9', updatedAt: '2020-01-01T00:00:00.000Z' }];
      expect(filterTombstonedRows(rows, tomb)).toEqual(rows);
    });
  });

  describe('parseTombstones (back-compat)', () => {
    it('parses the clock map form', () => {
      expect(parseTombstones({ s1: '2025-01-01T00:00:00.000Z' }, 'x')).toEqual({
        s1: '2025-01-01T00:00:00.000Z',
      });
    });
    it('migrates the legacy id-only array to the wire clock', () => {
      expect(parseTombstones(['s1', 's2'], '2025-05-01T00:00:00.000Z')).toEqual({
        s1: '2025-05-01T00:00:00.000Z',
        s2: '2025-05-01T00:00:00.000Z',
      });
    });
    it('returns undefined for empty/invalid', () => {
      expect(parseTombstones([], 'x')).toBeUndefined();
      expect(parseTombstones(null, 'x')).toBeUndefined();
    });
  });
});
