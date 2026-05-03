/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EncorePerformance, EncoreSong } from '../types';
import type { DirtySyncRow, RepertoireExtrasRow, SyncMetaRow } from '../db/encoreDb';

interface InMemoryTable<T> {
  rows: T[];
  toArray: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  bulkPut?: ReturnType<typeof vi.fn>;
  bulkDelete?: ReturnType<typeof vi.fn>;
}

function makeTable<T extends { id: string }>(initial: T[] = []): InMemoryTable<T> {
  const tbl: InMemoryTable<T> = {
    rows: [...initial],
    toArray: vi.fn(async () => [...tbl.rows]),
    get: vi.fn(async (id: string) => tbl.rows.find((r) => r.id === id)),
    put: vi.fn(async (item: T) => {
      const idx = tbl.rows.findIndex((r) => r.id === item.id);
      if (idx >= 0) tbl.rows[idx] = item;
      else tbl.rows.push(item);
    }),
    delete: vi.fn(async (id: string) => {
      tbl.rows = tbl.rows.filter((r) => r.id !== id);
    }),
    bulkPut: vi.fn(async (items: T[]) => {
      for (const item of items) {
        const idx = tbl.rows.findIndex((r) => r.id === item.id);
        if (idx >= 0) tbl.rows[idx] = item;
        else tbl.rows.push(item);
      }
    }),
    bulkDelete: vi.fn(async (ids: string[]) => {
      tbl.rows = tbl.rows.filter((r) => !ids.includes(r.id));
    }),
  };
  return tbl;
}

let songsTable: InMemoryTable<EncoreSong>;
let perfTable: InMemoryTable<EncorePerformance>;
let extrasTable: InMemoryTable<RepertoireExtrasRow>;
let dirtyTable: InMemoryTable<DirtySyncRow>;
let syncMetaState: SyncMetaRow;
let nextDriveFileSeq = 0;

vi.mock('../db/encoreDb', () => {
  return {
    encoreDb: {
      get songs() {
        return songsTable;
      },
      get performances() {
        return perfTable;
      },
      get repertoireExtras() {
        return extrasTable;
      },
      get dirtySync() {
        return dirtyTable;
      },
    },
    getSyncMeta: vi.fn(async () => ({ ...syncMetaState })),
    patchSyncMeta: vi.fn(async (patch: Partial<SyncMetaRow>) => {
      syncMetaState = { ...syncMetaState, ...patch, id: 'default' };
    }),
    takeDirtyRows: vi.fn(async () => [...dirtyTable.rows]),
    clearDirtyRows: vi.fn(async (ids: string[]) => {
      dirtyTable.rows = dirtyTable.rows.filter((r) => !ids.includes(r.id));
    }),
  };
});

vi.mock('./driveFetch', () => ({
  driveCreateFolder: vi.fn(async () => ({ id: `folder-${++nextDriveFileSeq}` })),
  driveCreateJsonFile: vi.fn(async () => ({ id: `file-${++nextDriveFileSeq}` })),
  driveGetFileMetadata: vi.fn(async (...args: unknown[]) => ({
    id: args[1] as string,
    modifiedTime: '2026-05-01T10:00:00.000Z',
  })),
  driveGetMedia: vi.fn(),
  driveListFiles: vi.fn(async () => ({ files: [] })),
  drivePatchJsonMedia: vi.fn(async (...args: unknown[]) => ({ id: args[1] as string })),
  driveTrashFile: vi.fn(async () => undefined),
}));

vi.mock('./bootstrapFolders', () => ({
  ensureEncoreDriveLayout: vi.fn(async () => ({
    rootFolderId: 'root-folder-id',
    performancesFolderId: 'perfs-folder-id',
    sheetMusicFolderId: 'sheet-folder-id',
    recordingsFolderId: 'recordings-folder-id',
    repertoireFileId: 'repertoire-file-id',
  })),
}));

import {
  driveCreateFolder,
  driveCreateJsonFile,
  driveGetMedia,
  drivePatchJsonMedia,
  driveTrashFile,
} from './driveFetch';
import {
  isShardedSyncEnabled,
  migrateMonolithicToShardedIfNeeded,
  pullChangedShards,
  pushDirtyShards,
  type ShardedRepertoireManifest,
} from './repertoireSharded';

function song(id: string, updatedAt: string): EncoreSong {
  return {
    id,
    title: id,
    artist: 'A',
    journalMarkdown: '',
    practicing: false,
    tags: [],
    referenceLinks: [],
    backingLinks: [],
    chartFiles: [],
    milestoneProgress: {},
    songOnlyMilestones: [],
    createdAt: updatedAt,
    updatedAt,
  } as EncoreSong;
}

function perf(id: string, songId: string, updatedAt: string): EncorePerformance {
  return {
    id,
    songId,
    date: '2026-04-01',
    venueTag: 'venue',
    notesMarkdown: '',
    accompaniment: 'self',
    createdAt: updatedAt,
    updatedAt,
  } as EncorePerformance;
}

function extras(updatedAt: string): RepertoireExtrasRow {
  return { id: 'default', venueCatalog: [], milestoneTemplate: [], updatedAt };
}

function emptyManifest(): ShardedRepertoireManifest {
  return {
    version: 1,
    exportedAt: '2026-04-01T00:00:00.000Z',
    songs: {},
    performances: {},
    extras: {},
  };
}

beforeEach(() => {
  songsTable = makeTable<EncoreSong>();
  perfTable = makeTable<EncorePerformance>();
  extrasTable = makeTable<RepertoireExtrasRow>([extras('2026-04-01T00:00:00.000Z')]);
  dirtyTable = makeTable<DirtySyncRow>();
  syncMetaState = {
    id: 'default',
    shardedRepertoireFolderId: 'sharded-root',
    shardedManifestFileId: 'manifest-file',
  };
  nextDriveFileSeq = 0;
  vi.clearAllMocks();
});

describe('isShardedSyncEnabled', () => {
  it('returns false by default when env flag is absent', () => {
    expect(isShardedSyncEnabled()).toBe(false);
  });
});

describe('pushDirtyShards', () => {
  it('drains dirty rows, creates per-row JSONs, updates manifest, clears dirty entries', async () => {
    songsTable.rows.push(song('s1', '2026-04-02T00:00:00.000Z'));
    perfTable.rows.push(perf('p1', 's1', '2026-04-02T00:00:01.000Z'));
    dirtyTable.rows.push(
      { id: 'song:s1', kind: 'song', rowId: 's1', op: 'upsert', markedAt: '2026-04-02' },
      { id: 'performance:p1', kind: 'performance', rowId: 'p1', op: 'upsert', markedAt: '2026-04-02' },
    );
    (driveGetMedia as any).mockResolvedValueOnce(JSON.stringify(emptyManifest()));

    const count = await pushDirtyShards('token');

    expect(count).toBe(2);
    // 1 song + 1 perf upload (manifest had no prior entry → create)
    expect(driveCreateJsonFile).toHaveBeenCalledTimes(2);
    // Manifest re-write at end of push
    expect(drivePatchJsonMedia).toHaveBeenCalled();
    // Dirty rows drained
    expect(dirtyTable.rows).toHaveLength(0);
  });

  it('uses the existing shard fileId on subsequent pushes (PATCH, not create)', async () => {
    songsTable.rows.push(song('s1', '2026-04-02T00:00:00.000Z'));
    dirtyTable.rows.push({ id: 'song:s1', kind: 'song', rowId: 's1', op: 'upsert', markedAt: '2026-04-02' });
    const manifest: ShardedRepertoireManifest = {
      ...emptyManifest(),
      songs: { s1: { fileId: 'shard-s1', updatedAt: '2026-04-01T00:00:00.000Z' } },
    };
    (driveGetMedia as any).mockResolvedValueOnce(JSON.stringify(manifest));

    await pushDirtyShards('token');

    // Should PATCH the existing shard, not create a new one. drivePatchJsonMedia is called once for
    // the shard and once for the manifest (= 2 total).
    expect(drivePatchJsonMedia).toHaveBeenCalledTimes(2);
    expect(driveCreateJsonFile).not.toHaveBeenCalled();
  });

  it('handles delete entries by trashing the shard and removing from the manifest', async () => {
    dirtyTable.rows.push({
      id: 'song:s1',
      kind: 'song',
      rowId: 's1',
      op: 'delete',
      markedAt: '2026-04-02',
    });
    const manifest: ShardedRepertoireManifest = {
      ...emptyManifest(),
      songs: { s1: { fileId: 'shard-s1', updatedAt: '2026-04-01T00:00:00.000Z' } },
    };
    (driveGetMedia as any).mockResolvedValueOnce(JSON.stringify(manifest));

    await pushDirtyShards('token');

    expect(driveTrashFile).toHaveBeenCalledWith('token', 'shard-s1');
    // Manifest patched without the shard entry
    const lastPatch = (drivePatchJsonMedia as any).mock.calls.at(-1);
    const patchedBody = JSON.parse(lastPatch[2]) as ShardedRepertoireManifest;
    expect(patchedBody.songs).toEqual({});
  });

  it('returns 0 immediately when there is nothing dirty', async () => {
    const count = await pushDirtyShards('token');
    expect(count).toBe(0);
    expect(driveGetMedia).not.toHaveBeenCalled();
    expect(drivePatchJsonMedia).not.toHaveBeenCalled();
  });
});

describe('pullChangedShards', () => {
  it('fetches only shards whose manifest updatedAt is newer than the local row', async () => {
    songsTable.rows.push(song('s1', '2026-04-01T00:00:00.000Z'));
    songsTable.rows.push(song('s2', '2026-04-02T00:00:00.000Z'));
    const manifest: ShardedRepertoireManifest = {
      ...emptyManifest(),
      songs: {
        s1: { fileId: 'shard-s1', updatedAt: '2026-04-03T00:00:00.000Z' }, // newer → fetch
        s2: { fileId: 'shard-s2', updatedAt: '2026-04-01T00:00:00.000Z' }, // older → skip
      },
    };
    (driveGetMedia as any)
      .mockResolvedValueOnce(JSON.stringify(manifest)) // manifest read
      .mockResolvedValueOnce(JSON.stringify(song('s1', '2026-04-03T00:00:00.000Z'))); // s1 shard

    const result = await pullChangedShards('token');

    expect(result.songs).toBe(1);
    // 1 manifest fetch + 1 shard fetch
    expect(driveGetMedia).toHaveBeenCalledTimes(2);
  });

  it('deletes Dexie rows that the manifest no longer lists', async () => {
    songsTable.rows.push(song('s1', '2026-04-01T00:00:00.000Z'));
    songsTable.rows.push(song('orphan', '2026-04-01T00:00:00.000Z'));
    const manifest: ShardedRepertoireManifest = {
      ...emptyManifest(),
      songs: { s1: { fileId: 'shard-s1', updatedAt: '2026-04-01T00:00:00.000Z' } },
    };
    (driveGetMedia as any).mockResolvedValueOnce(JSON.stringify(manifest));

    const result = await pullChangedShards('token');

    expect(result.deleted).toBe(1);
    expect(songsTable.rows.find((r) => r.id === 'orphan')).toBeUndefined();
  });
});

describe('migrateMonolithicToShardedIfNeeded', () => {
  it('fans every Dexie row out into a shard the first time it runs', async () => {
    songsTable.rows.push(song('s1', '2026-04-01T00:00:00.000Z'));
    perfTable.rows.push(perf('p1', 's1', '2026-04-01T00:00:00.000Z'));
    (driveGetMedia as any).mockResolvedValueOnce(JSON.stringify(emptyManifest()));

    const res = await migrateMonolithicToShardedIfNeeded('token');

    expect(res.migrated).toBe(true);
    // 1 song shard + 1 performance shard + 1 extras shard
    expect(driveCreateJsonFile).toHaveBeenCalledTimes(3);
    expect(syncMetaState.shardedMigratedAt).toBeTruthy();
  });

  it('is a no-op when migration has already run', async () => {
    syncMetaState = { ...syncMetaState, shardedMigratedAt: '2026-04-01T00:00:00.000Z' };
    const res = await migrateMonolithicToShardedIfNeeded('token');
    expect(res.migrated).toBe(false);
    expect(driveCreateJsonFile).not.toHaveBeenCalled();
  });

  it('skips re-creating shards when the manifest already contains rows', async () => {
    const manifest: ShardedRepertoireManifest = {
      ...emptyManifest(),
      songs: { existing: { fileId: 'shard-existing', updatedAt: '2026-04-01T00:00:00.000Z' } },
    };
    (driveGetMedia as any).mockResolvedValueOnce(JSON.stringify(manifest));

    const res = await migrateMonolithicToShardedIfNeeded('token');

    expect(res.migrated).toBe(false);
    expect(driveCreateJsonFile).not.toHaveBeenCalled();
    expect(syncMetaState.shardedMigratedAt).toBeTruthy();
  });

  it('creates the sharded folder layout if it has not been ensured yet', async () => {
    syncMetaState = { id: 'default' };
    (driveGetMedia as any).mockResolvedValueOnce(JSON.stringify(emptyManifest()));

    await migrateMonolithicToShardedIfNeeded('token');

    // 1 sharded root + 3 subfolders (song/perf/extras)
    expect(driveCreateFolder).toHaveBeenCalledTimes(4);
    expect(syncMetaState.shardedRepertoireFolderId).toBeTruthy();
    expect(syncMetaState.shardedManifestFileId).toBeTruthy();
  });
});
