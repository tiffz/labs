/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Characterization tests for the P0 originals data-loss class.
 *
 * Three code facts used to compose into silent, total loss of the user's songwriting:
 *   1. `pullChangedOriginalsShards` deleted every local original absent from the remote manifest.
 *   2. `ensureOriginalsDriveLayout` writes an **empty** manifest when Drive has none.
 *   3. `runSync` pulled originals before pushing them, and the repertoire pull's `dirtySync.clear()`
 *      wiped the `kind: 'original'` rows that would have driven the push.
 *
 * So a first Drive sign-in from a device holding local originals deleted all of them, and no
 * tombstone existed to distinguish "deleted on a peer" from "not pushed yet".
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DirtySyncRow, RepertoireExtrasRow, SyncMetaRow } from '../../db/encoreDb';
import type { EncoreOriginalSong } from '../types';
import type { OriginalTakeBlobRow } from '../originalTakeLocalAudio';

interface InMemoryTable<T> {
  rows: T[];
  toArray: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  bulkDelete: ReturnType<typeof vi.fn>;
  toCollection: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
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
    bulkDelete: vi.fn(async (ids: string[]) => {
      tbl.rows = tbl.rows.filter((r) => !ids.includes(r.id));
    }),
    toCollection: vi.fn(() => ({
      primaryKeys: vi.fn(async () => tbl.rows.map((r) => r.id)),
    })),
    where: vi.fn((field: string) => ({
      equals: (value: unknown) => ({
        delete: vi.fn(async () => {
          tbl.rows = tbl.rows.filter((r) => (r as any)[field] !== value);
        }),
        toArray: vi.fn(async () => tbl.rows.filter((r) => (r as any)[field] === value)),
      }),
    })),
  };
  return tbl;
}

let originalsTable: InMemoryTable<EncoreOriginalSong>;
let blobsTable: InMemoryTable<OriginalTakeBlobRow>;
let extrasTable: InMemoryTable<RepertoireExtrasRow>;
let dirtyTable: InMemoryTable<DirtySyncRow>;
let syncMetaState: SyncMetaRow;
let remoteManifestJson: string;

vi.mock('../../db/encoreDb', () => ({
  encoreDb: {
    get originals() {
      return originalsTable;
    },
    get originalTakeBlobs() {
      return blobsTable;
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
  markDirtyRow: vi.fn(async () => undefined),
  takeDirtyRows: vi.fn(async () => [...dirtyTable.rows]),
  clearDirtyRows: vi.fn(async (ids: string[]) => {
    dirtyTable.rows = dirtyTable.rows.filter((r) => !ids.includes(r.id));
  }),
}));

vi.mock('../../drive/driveFetch', () => ({
  driveCreateFolder: vi.fn(async () => ({ id: 'folder-id' })),
  driveCreateJsonFile: vi.fn(async () => ({ id: 'manifest-file-id' })),
  driveGetFileMetadata: vi.fn(async () => ({
    id: 'manifest-file-id',
    modifiedTime: '2026-05-01T10:00:00.000Z',
  })),
  driveGetMedia: vi.fn(async () => remoteManifestJson),
  driveListFiles: vi.fn(async () => ({ files: [{ id: 'manifest-file-id' }] })),
  drivePatchJsonMedia: vi.fn(async () => ({ id: 'manifest-file-id' })),
  driveTrashFile: vi.fn(async () => undefined),
}));

vi.mock('../../drive/bootstrapFolders', () => ({
  ensureEncoreDriveLayout: vi.fn(async () => ({ rootFolderId: 'root-folder-id' })),
}));

import { pullChangedOriginalsShards } from './originalsSharded';

function original(id: string, updatedAt: string): EncoreOriginalSong {
  return {
    id,
    title: id,
    key: 'C',
    tempo: 100,
    lyricsAndChords: 'verse',
    takes: [],
    mainTakeId: null,
    history: [],
    createdAt: updatedAt,
    updatedAt,
  } as EncoreOriginalSong;
}

function blob(songId: string, takeId: string): OriginalTakeBlobRow {
  return {
    id: `${songId}:${takeId}`,
    songId,
    takeId,
    mimeType: 'audio/mpeg',
    blob: new Blob(['x']),
    updatedAt: '2026-05-01T00:00:00.000Z',
  };
}

beforeEach(() => {
  originalsTable = makeTable<EncoreOriginalSong>();
  blobsTable = makeTable<OriginalTakeBlobRow>();
  extrasTable = makeTable<RepertoireExtrasRow>();
  dirtyTable = makeTable<DirtySyncRow>();
  syncMetaState = {
    id: 'default',
    originalsFolderId: 'originals-folder-id',
    originalsManifestFileId: 'manifest-file-id',
  } as SyncMetaRow;
  remoteManifestJson = JSON.stringify({ version: 1, originals: {} });
});

describe('pullChangedOriginalsShards — delete policy', () => {
  it('does NOT delete a local original merely because the remote manifest omits it', async () => {
    // The P0: an original created on this device and not yet pushed. Manifest absence is not
    // evidence of a delete — it is the normal state of anything created offline.
    originalsTable.rows = [original('o1', '2026-05-02T00:00:00.000Z')];

    await pullChangedOriginalsShards('token');

    expect(originalsTable.rows.map((r) => r.id)).toEqual(['o1']);
  });

  it('does NOT wipe local originals when Drive returns a freshly-created empty manifest', async () => {
    // `ensureOriginalsDriveLayout` writes an empty manifest on first sign-in. Under the old sweep
    // this deleted every song the user had written on this device.
    originalsTable.rows = [
      original('o1', '2026-05-02T00:00:00.000Z'),
      original('o2', '2026-05-03T00:00:00.000Z'),
    ];
    remoteManifestJson = '';

    await pullChangedOriginalsShards('token');

    expect(originalsTable.rows.map((r) => r.id).sort()).toEqual(['o1', 'o2']);
  });

  it('deletes a local original that carries a tombstone at or newer than its updatedAt', async () => {
    originalsTable.rows = [original('o1', '2026-05-01T00:00:00.000Z')];
    extrasTable.rows = [
      {
        id: 'default',
        venueCatalog: [],
        milestoneTemplate: [],
        deletedOriginalIds: { o1: '2026-05-02T00:00:00.000Z' },
        updatedAt: '2026-05-02T00:00:00.000Z',
      } as RepertoireExtrasRow,
    ];

    await pullChangedOriginalsShards('token');

    expect(originalsTable.rows).toEqual([]);
  });

  it('keeps an original edited after its delete (clock supersede, matches song/performance rules)', async () => {
    // Undo-of-delete bumps `updatedAt`, so the restored row must survive a peer's stale tombstone.
    originalsTable.rows = [original('o1', '2026-05-03T00:00:00.000Z')];
    extrasTable.rows = [
      {
        id: 'default',
        venueCatalog: [],
        milestoneTemplate: [],
        deletedOriginalIds: { o1: '2026-05-02T00:00:00.000Z' },
        updatedAt: '2026-05-02T00:00:00.000Z',
      } as RepertoireExtrasRow,
    ];

    await pullChangedOriginalsShards('token');

    expect(originalsTable.rows.map((r) => r.id)).toEqual(['o1']);
  });
});

describe('pullChangedOriginalsShards — take blob reclamation', () => {
  it('drops take blobs for a tombstoned original', async () => {
    originalsTable.rows = [original('o1', '2026-05-01T00:00:00.000Z')];
    blobsTable.rows = [blob('o1', 't1'), blob('o1', 't2')];
    extrasTable.rows = [
      {
        id: 'default',
        venueCatalog: [],
        milestoneTemplate: [],
        deletedOriginalIds: { o1: '2026-05-02T00:00:00.000Z' },
        updatedAt: '2026-05-02T00:00:00.000Z',
      } as RepertoireExtrasRow,
    ];

    await pullChangedOriginalsShards('token');

    expect(blobsTable.rows).toEqual([]);
  });

  it('reclaims orphaned blobs whose original is already gone, and keeps live ones', async () => {
    originalsTable.rows = [original('o1', '2026-05-01T00:00:00.000Z')];
    blobsTable.rows = [blob('o1', 't1'), blob('gone', 't1')];

    await pullChangedOriginalsShards('token');

    expect(blobsTable.rows.map((r) => r.id)).toEqual(['o1:t1']);
  });
});
