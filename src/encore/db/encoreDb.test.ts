import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearDirtyRows,
  dirtySyncRowKey,
  encoreDb,
  getSyncMeta,
  markDirtyRow,
  markDirtyRows,
  patchSyncMeta,
  takeDirtyRows,
} from './encoreDb';
import type { EncorePerformance, EncoreSong } from '../types';

beforeEach(async () => {
  await encoreDb.songs.clear();
  await encoreDb.performances.clear();
  await encoreDb.syncMeta.clear();
  await encoreDb.repertoireExtras.clear();
  await encoreDb.dirtySync.clear();
});

afterEach(async () => {
  await encoreDb.songs.clear();
  await encoreDb.performances.clear();
  await encoreDb.syncMeta.clear();
  await encoreDb.repertoireExtras.clear();
  await encoreDb.dirtySync.clear();
});

describe('encoreDb schema', () => {
  it('opens at version 4 with songs/performances/syncMeta/repertoireExtras/dirtySync tables', async () => {
    expect(encoreDb.verno).toBe(4);
    expect(encoreDb.tables.map((t) => t.name).sort()).toEqual(
      ['dirtySync', 'performances', 'repertoireExtras', 'songs', 'syncMeta'].sort(),
    );
  });

  it('round-trips an EncoreSong with primary key + secondary indexes', async () => {
    const now = new Date().toISOString();
    const s: EncoreSong = {
      id: 's1',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      journalMarkdown: '',
      practicing: true,
      createdAt: now,
      updatedAt: now,
    };
    await encoreDb.songs.put(s);
    const out = await encoreDb.songs.get('s1');
    expect(out?.title).toBe('Bohemian Rhapsody');

    const byArtist = await encoreDb.songs.where('artist').equals('Queen').toArray();
    expect(byArtist).toHaveLength(1);

    const practicing = await encoreDb.songs.filter((row) => row.practicing === true).toArray();
    expect(practicing.map((p) => p.id)).toContain('s1');
  });

  it('round-trips an EncorePerformance with songId index', async () => {
    const now = new Date().toISOString();
    const p: EncorePerformance = {
      id: 'p1',
      songId: 's1',
      date: '2025-01-15',
      venueTag: 'Open Mic',
      notes: '',
      createdAt: now,
      updatedAt: now,
    };
    await encoreDb.performances.put(p);
    const list = await encoreDb.performances.where('songId').equals('s1').toArray();
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe('p1');
  });
});

describe('getSyncMeta / patchSyncMeta', () => {
  it('getSyncMeta lazily creates a default row when none exists', async () => {
    expect(await encoreDb.syncMeta.count()).toBe(0);
    const meta = await getSyncMeta();
    expect(meta).toEqual({ id: 'default' });
    expect(await encoreDb.syncMeta.count()).toBe(1);
  });

  it('patchSyncMeta merges patches without losing existing fields', async () => {
    await patchSyncMeta({ rootFolderId: 'root-1' });
    await patchSyncMeta({ repertoireFileId: 'file-1' });
    const meta = await getSyncMeta();
    expect(meta).toEqual({
      id: 'default',
      rootFolderId: 'root-1',
      repertoireFileId: 'file-1',
    });
  });

  it('patchSyncMeta overwrites the same field on subsequent patches', async () => {
    await patchSyncMeta({ lastRemoteEtag: 'etag-A' });
    await patchSyncMeta({ lastRemoteEtag: 'etag-B' });
    const meta = await getSyncMeta();
    expect(meta.lastRemoteEtag).toBe('etag-B');
  });

  it('patchSyncMeta does not clear optional fields when patch omits them via undefined', async () => {
    await patchSyncMeta({ snapshotFileId: 'snap-1', rootFolderId: 'root-1' });
    await patchSyncMeta({ rootFolderId: 'root-2', snapshotFileId: undefined });
    const meta = await getSyncMeta();
    expect(meta.rootFolderId).toBe('root-2');
    expect(meta.snapshotFileId).toBe('snap-1');
  });

  it('patchSyncMeta always pins the row id to "default"', async () => {
    await patchSyncMeta({
      // @ts-expect-error - test explicitly tries to override the id
      id: 'attacker',
      rootFolderId: 'root-1',
    });
    const meta = await getSyncMeta();
    expect(meta.id).toBe('default');
    expect(await encoreDb.syncMeta.count()).toBe(1);
  });

  it('repeated getSyncMeta calls do not duplicate the default row', async () => {
    await getSyncMeta();
    await getSyncMeta();
    await getSyncMeta();
    expect(await encoreDb.syncMeta.count()).toBe(1);
  });
});

describe('dirtySync helpers', () => {
  it('markDirtyRow upserts under a stable compound id (kind:rowId)', async () => {
    await markDirtyRow('song', 's1', 'upsert');
    await markDirtyRow('song', 's1', 'upsert'); // same row → coalesces
    const rows = await takeDirtyRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(dirtySyncRowKey('song', 's1'));
    expect(rows[0]!.op).toBe('upsert');
  });

  it('markDirtyRow promotes a row from upsert → delete on later writes', async () => {
    await markDirtyRow('song', 's1', 'upsert');
    await markDirtyRow('song', 's1', 'delete');
    const rows = await takeDirtyRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.op).toBe('delete');
  });

  it('markDirtyRows is a no-op for an empty list', async () => {
    await markDirtyRows([]);
    expect((await takeDirtyRows()).length).toBe(0);
  });

  it('markDirtyRows + clearDirtyRows round-trips a batch of mixed kinds', async () => {
    await markDirtyRows([
      { kind: 'song', rowId: 's1' },
      { kind: 'performance', rowId: 'p1' },
      { kind: 'extras', rowId: 'default' },
    ]);
    const rows = await takeDirtyRows();
    expect(rows.map((r) => r.id).sort()).toEqual(
      [dirtySyncRowKey('song', 's1'), dirtySyncRowKey('performance', 'p1'), dirtySyncRowKey('extras', 'default')].sort(),
    );
    await clearDirtyRows(rows.map((r) => r.id));
    expect((await takeDirtyRows()).length).toBe(0);
  });

  it('clearDirtyRows is a no-op for an empty id list (does not wipe other entries)', async () => {
    await markDirtyRow('song', 's1', 'upsert');
    await clearDirtyRows([]);
    expect((await takeDirtyRows()).length).toBe(1);
  });
});
