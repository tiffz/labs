import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { encoreDb } from '../db/encoreDb';
import {
  clearDeletedPerformanceIds,
  clearDeletedSongIds,
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

describe('encoreRepertoireTombstones', () => {
  it('records deleted song ids into repertoire extras', async () => {
    await recordDeletedSongIds(['s1', 's2']);
    expect((await extras())?.deletedSongIds?.sort()).toEqual(['s1', 's2']);
  });

  it('records deleted performance ids separately from songs', async () => {
    await recordDeletedPerformanceIds(['p1']);
    const row = await extras();
    expect(row?.deletedPerformanceIds).toEqual(['p1']);
    expect(row?.deletedSongIds).toBeUndefined();
  });

  it('dedupes and merges across multiple record calls', async () => {
    await recordDeletedSongIds(['s1']);
    await recordDeletedSongIds(['s1', 's2']);
    expect((await extras())?.deletedSongIds?.sort()).toEqual(['s1', 's2']);
  });

  it('clears a tombstone when the row is restored (undo)', async () => {
    await recordDeletedSongIds(['s1', 's2']);
    await clearDeletedSongIds(['s1']);
    expect((await extras())?.deletedSongIds).toEqual(['s2']);
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

  it('unionDeletedRowIds merges and returns undefined when empty', () => {
    expect(unionDeletedRowIds(['a'], ['b', 'a'])?.sort()).toEqual(['a', 'b']);
    expect(unionDeletedRowIds(undefined, undefined)).toBeUndefined();
  });
});
