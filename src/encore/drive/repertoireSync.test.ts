/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EncorePerformance, EncoreSong, RepertoireWirePayload } from '../types';
import type { RepertoireExtrasRow, SyncMetaRow } from '../db/encoreDb';

interface InMemoryTable<T> {
  rows: T[];
  toArray: ReturnType<typeof vi.fn>;
  bulkPut: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  get?: ReturnType<typeof vi.fn>;
}

function makeTable<T>(initial: T[] = []): InMemoryTable<T> {
  const tbl: InMemoryTable<T> = {
    rows: [...initial],
    toArray: vi.fn(async () => [...tbl.rows]),
    bulkPut: vi.fn(async (items: T[]) => {
      tbl.rows.push(...items);
    }),
    put: vi.fn(async (item: T) => {
      const idx = tbl.rows.findIndex((r) => (r as { id?: string }).id === (item as { id?: string }).id);
      if (idx >= 0) tbl.rows[idx] = item;
      else tbl.rows.push(item);
    }),
    clear: vi.fn(async () => {
      tbl.rows = [];
    }),
  };
  return tbl;
}

let songsTable: InMemoryTable<EncoreSong>;
let perfTable: InMemoryTable<EncorePerformance>;
let extrasTable: InMemoryTable<RepertoireExtrasRow>;
let syncMetaState: SyncMetaRow;

vi.mock('../db/encoreDb', () => {
  const transaction = vi.fn(async (_mode: string, ..._tables: unknown[]) => {
    const fn = _tables[_tables.length - 1] as () => Promise<void>;
    await fn();
  });
  return {
    encoreDb: {
      get songs() {
        return songsTable;
      },
      get performances() {
        return perfTable;
      },
      get repertoireExtras() {
        return {
          ...extrasTable,
          get: vi.fn(async (id: string) => extrasTable.rows.find((r) => r.id === id)),
        };
      },
      transaction,
    },
    getSyncMeta: vi.fn(async () => ({ ...syncMetaState })),
    patchSyncMeta: vi.fn(async (patch: Partial<SyncMetaRow>) => {
      syncMetaState = { ...syncMetaState, ...patch, id: 'default' };
    }),
  };
});

vi.mock('./driveFetch', () => ({
  driveGetFileMetadata: vi.fn(),
  driveGetMedia: vi.fn(),
  drivePatchJsonMedia: vi.fn(),
}));

vi.mock('./bootstrapFolders', () => ({
  ensureEncoreDriveLayout: vi.fn(),
}));

import {
  driveGetFileMetadata,
  driveGetMedia,
  drivePatchJsonMedia,
} from './driveFetch';
import { ensureEncoreDriveLayout } from './bootstrapFolders';
import {
  pullRepertoireFromDrive,
  pushRepertoireToDrive,
  resolveConflictKeepLocal,
  resolveConflictUseRemoteThenPush,
  runInitialSyncIfPossible,
} from './repertoireSync';

const REPERTOIRE_FILE_ID = 'repertoire-file-1';

function song(id: string, updatedAt: string, title = id): EncoreSong {
  return {
    id,
    title,
    artist: 'A',
    journalMarkdown: '',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt,
  };
}

function perf(id: string, songId: string, updatedAt: string): EncorePerformance {
  return {
    id,
    songId,
    date: '2025-01-15',
    venueTag: 'Open Mic',
    notes: '',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt,
  };
}

function wirePayload(songs: EncoreSong[], performances: EncorePerformance[]): string {
  const wire: RepertoireWirePayload = {
    version: 1,
    exportedAt: '2025-06-01T00:00:00.000Z',
    songs,
    performances,
    venueCatalog: [],
    milestoneTemplate: [],
  };
  return JSON.stringify(wire);
}

beforeEach(() => {
  vi.clearAllMocks();
  songsTable = makeTable<EncoreSong>();
  perfTable = makeTable<EncorePerformance>();
  extrasTable = makeTable<RepertoireExtrasRow>();
  syncMetaState = { id: 'default', repertoireFileId: REPERTOIRE_FILE_ID };
});

describe('pullRepertoireFromDrive', () => {
  it('merges remote rows into Dexie and updates sync meta with the remote etag/modifiedTime', async () => {
    const local = [song('s1', '2025-05-01T00:00:00.000Z')];
    songsTable.rows = [...local];
    const remoteSongs = [
      song('s1', '2025-06-01T00:00:00.000Z', 'Renamed by remote'),
      song('s2', '2025-05-30T00:00:00.000Z'),
    ];
    (driveGetMedia as any).mockResolvedValueOnce(wirePayload(remoteSongs, []));
    (driveGetFileMetadata as any).mockResolvedValueOnce({
      id: REPERTOIRE_FILE_ID,
      modifiedTime: '2025-06-01T01:00:00.000Z',
      etag: 'etagA',
    });

    await pullRepertoireFromDrive('tok', REPERTOIRE_FILE_ID, 'fallbackEtag');

    expect(songsTable.rows.map((s) => s.id).sort()).toEqual(['s1', 's2']);
    const s1 = songsTable.rows.find((s) => s.id === 's1')!;
    expect(s1.title).toBe('Renamed by remote');
    expect(syncMetaState.lastRemoteEtag).toBe('etagA');
    expect(syncMetaState.lastRemoteModified).toBe('2025-06-01T01:00:00.000Z');
    expect(syncMetaState.lastSuccessfulPullAt).toBeDefined();
  });

  it('falls back to the supplied remoteEtag when Drive metadata omits etag', async () => {
    (driveGetMedia as any).mockResolvedValueOnce(wirePayload([], []));
    (driveGetFileMetadata as any).mockResolvedValueOnce({
      id: REPERTOIRE_FILE_ID,
      modifiedTime: '2025-06-01T01:00:00.000Z',
    });
    await pullRepertoireFromDrive('tok', REPERTOIRE_FILE_ID, 'fallbackEtag');
    expect(syncMetaState.lastRemoteEtag).toBe('fallbackEtag');
  });
});

describe('pushRepertoireToDrive', () => {
  it('serializes local rows + extras and sends If-Match etag through drivePatchJsonMedia', async () => {
    songsTable.rows = [song('s1', '2025-05-01T00:00:00.000Z', 'Pushed Title')];
    perfTable.rows = [perf('p1', 's1', '2025-05-02T00:00:00.000Z')];
    extrasTable.rows = [
      {
        id: 'default',
        venueCatalog: ['Open Mic'],
        milestoneTemplate: [],
        updatedAt: '2025-05-01T00:00:00.000Z',
      },
    ];
    (drivePatchJsonMedia as any).mockResolvedValueOnce({
      id: REPERTOIRE_FILE_ID,
      modifiedTime: '2025-06-01T00:00:00.000Z',
      etag: 'fromPatch',
    });
    (driveGetFileMetadata as any).mockResolvedValueOnce({
      id: REPERTOIRE_FILE_ID,
      modifiedTime: '2025-06-01T00:00:01.000Z',
      etag: 'fromMeta',
    });

    await pushRepertoireToDrive('tok', REPERTOIRE_FILE_ID, 'priorEtag');

    expect(drivePatchJsonMedia).toHaveBeenCalledTimes(1);
    const [, fileIdArg, bodyArg, ifMatchArg] = (drivePatchJsonMedia as any).mock.calls[0];
    expect(fileIdArg).toBe(REPERTOIRE_FILE_ID);
    expect(ifMatchArg).toBe('priorEtag');
    const wire = JSON.parse(bodyArg);
    expect(wire.songs[0].title).toBe('Pushed Title');
    expect(wire.performances[0].songId).toBe('s1');
    expect(syncMetaState.lastRemoteEtag).toBe('fromMeta');
    expect(syncMetaState.lastSuccessfulPushAt).toBeDefined();
  });
});

describe('runInitialSyncIfPossible', () => {
  function setLayoutOk() {
    (ensureEncoreDriveLayout as any).mockResolvedValue({
      rootFolderId: 'root',
      performancesFolderId: 'perf',
      sheetMusicFolderId: 'sheet',
      recordingsFolderId: 'rec',
      repertoireFileId: REPERTOIRE_FILE_ID,
    });
  }

  it('returns ok=true and no-ops on a clean local + same-remote state', async () => {
    setLayoutOk();
    syncMetaState = {
      id: 'default',
      repertoireFileId: REPERTOIRE_FILE_ID,
      lastRemoteModified: '2025-06-01T00:00:00.000Z',
      lastSyncedLocalMaxUpdatedAt: '2025-05-01T00:00:00.000Z',
      lastRemoteEtag: 'etag',
    };
    songsTable.rows = [song('s1', '2025-05-01T00:00:00.000Z')];
    (driveGetFileMetadata as any).mockResolvedValueOnce({
      id: REPERTOIRE_FILE_ID,
      modifiedTime: '2025-06-01T00:00:00.000Z',
      etag: 'etag',
    });

    const r = await runInitialSyncIfPossible('tok');
    expect(r.ok).toBe(true);
    expect(r.conflict).toBeUndefined();
    expect(driveGetMedia).not.toHaveBeenCalled();
    expect(drivePatchJsonMedia).not.toHaveBeenCalled();
  });

  it('pulls when the remote has been newly modified since lastRemoteModified', async () => {
    setLayoutOk();
    syncMetaState = {
      id: 'default',
      repertoireFileId: REPERTOIRE_FILE_ID,
      lastRemoteModified: '2025-06-01T00:00:00.000Z',
      lastSyncedLocalMaxUpdatedAt: '2025-05-01T00:00:00.000Z',
    };
    songsTable.rows = [song('s1', '2025-05-01T00:00:00.000Z')];
    (driveGetFileMetadata as any)
      .mockResolvedValueOnce({
        id: REPERTOIRE_FILE_ID,
        modifiedTime: '2025-06-02T00:00:00.000Z',
        etag: 'newEtag',
      })
      .mockResolvedValueOnce({
        id: REPERTOIRE_FILE_ID,
        modifiedTime: '2025-06-02T00:00:00.000Z',
        etag: 'newEtag',
      });
    (driveGetMedia as any).mockResolvedValueOnce(
      wirePayload([song('s1', '2025-06-01T12:00:00.000Z', 'Remote update')], []),
    );

    const r = await runInitialSyncIfPossible('tok');
    expect(r.ok).toBe(true);
    expect(driveGetMedia).toHaveBeenCalled();
    expect(songsTable.rows.find((s) => s.id === 's1')!.title).toBe('Remote update');
  });

  it('pushes when local is dirty and remote has not changed', async () => {
    setLayoutOk();
    syncMetaState = {
      id: 'default',
      repertoireFileId: REPERTOIRE_FILE_ID,
      lastRemoteModified: '2025-06-01T00:00:00.000Z',
      lastSyncedLocalMaxUpdatedAt: '2025-05-01T00:00:00.000Z',
      lastRemoteEtag: 'priorEtag',
    };
    songsTable.rows = [song('s1', '2025-06-15T00:00:00.000Z', 'Local dirty')];
    (driveGetFileMetadata as any)
      .mockResolvedValueOnce({
        id: REPERTOIRE_FILE_ID,
        modifiedTime: '2025-06-01T00:00:00.000Z',
        etag: 'priorEtag',
      })
      .mockResolvedValueOnce({
        id: REPERTOIRE_FILE_ID,
        modifiedTime: '2025-06-15T00:00:00.000Z',
        etag: 'newPushEtag',
      });
    (drivePatchJsonMedia as any).mockResolvedValueOnce({
      id: REPERTOIRE_FILE_ID,
      modifiedTime: '2025-06-15T00:00:00.000Z',
      etag: 'newPushEtag',
    });

    const r = await runInitialSyncIfPossible('tok');
    expect(r.ok).toBe(true);
    expect(drivePatchJsonMedia).toHaveBeenCalledTimes(1);
    const [, , , ifMatch] = (drivePatchJsonMedia as any).mock.calls[0];
    expect(ifMatch).toBe('priorEtag');
  });

  it('returns conflict=true when both local and remote have changed since last sync', async () => {
    setLayoutOk();
    syncMetaState = {
      id: 'default',
      repertoireFileId: REPERTOIRE_FILE_ID,
      lastRemoteModified: '2025-06-01T00:00:00.000Z',
      lastSyncedLocalMaxUpdatedAt: '2025-05-01T00:00:00.000Z',
      lastRemoteEtag: 'priorEtag',
    };
    songsTable.rows = [song('s1', '2025-06-15T00:00:00.000Z', 'Local dirty')];
    (driveGetFileMetadata as any).mockResolvedValueOnce({
      id: REPERTOIRE_FILE_ID,
      modifiedTime: '2025-06-10T00:00:00.000Z',
      etag: 'remoteEtag',
    });

    const r = await runInitialSyncIfPossible('tok');
    expect(r.ok).toBe(false);
    expect(r.conflict?.conflict).toBe(true);
    expect(r.conflict?.reason).toBe('local_and_remote_changed');
    expect(r.conflict?.remoteEtag).toBe('remoteEtag');
    expect(driveGetMedia).not.toHaveBeenCalled();
    expect(drivePatchJsonMedia).not.toHaveBeenCalled();
  });

  it('captures bootstrap errors and surfaces them as ok=false with a message', async () => {
    (ensureEncoreDriveLayout as any).mockRejectedValueOnce(new Error('no Drive scope'));
    const r = await runInitialSyncIfPossible('tok');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no Drive scope/);
  });
});

describe('resolveConflictUseRemoteThenPush', () => {
  it('pulls then pushes using the freshly captured etag', async () => {
    syncMetaState = {
      id: 'default',
      repertoireFileId: REPERTOIRE_FILE_ID,
    };
    (driveGetMedia as any).mockResolvedValueOnce(wirePayload([], []));
    (driveGetFileMetadata as any)
      .mockResolvedValueOnce({
        id: REPERTOIRE_FILE_ID,
        modifiedTime: '2025-06-10T00:00:00.000Z',
        etag: 'pulled-etag',
      })
      .mockResolvedValueOnce({
        id: REPERTOIRE_FILE_ID,
        modifiedTime: '2025-06-10T00:00:01.000Z',
        etag: 'pushed-etag',
      });
    (drivePatchJsonMedia as any).mockResolvedValueOnce({
      id: REPERTOIRE_FILE_ID,
      modifiedTime: '2025-06-10T00:00:01.000Z',
      etag: 'pushed-etag',
    });

    await resolveConflictUseRemoteThenPush('tok');

    expect(driveGetMedia).toHaveBeenCalledTimes(1);
    expect(drivePatchJsonMedia).toHaveBeenCalledTimes(1);
    const [, , , ifMatch] = (drivePatchJsonMedia as any).mock.calls[0];
    expect(ifMatch).toBe('pulled-etag');
  });

  it('throws when meta has no repertoireFileId', async () => {
    syncMetaState = { id: 'default' };
    await expect(resolveConflictUseRemoteThenPush('tok')).rejects.toThrow('Not bootstrapped');
  });
});

describe('resolveConflictKeepLocal', () => {
  it('pushes without an If-Match etag (force overwrite)', async () => {
    syncMetaState = {
      id: 'default',
      repertoireFileId: REPERTOIRE_FILE_ID,
      lastRemoteEtag: 'something',
    };
    (drivePatchJsonMedia as any).mockResolvedValueOnce({
      id: REPERTOIRE_FILE_ID,
      modifiedTime: '2025-06-10T00:00:00.000Z',
      etag: 'forced',
    });
    (driveGetFileMetadata as any).mockResolvedValueOnce({
      id: REPERTOIRE_FILE_ID,
      modifiedTime: '2025-06-10T00:00:00.000Z',
      etag: 'forced',
    });

    await resolveConflictKeepLocal('tok');

    const [, , , ifMatch] = (drivePatchJsonMedia as any).mock.calls[0];
    expect(ifMatch).toBeUndefined();
  });

  it('throws when meta has no repertoireFileId', async () => {
    syncMetaState = { id: 'default' };
    await expect(resolveConflictKeepLocal('tok')).rejects.toThrow('Not bootstrapped');
  });
});
