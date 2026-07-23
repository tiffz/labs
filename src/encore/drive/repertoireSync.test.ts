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
let dirtySyncTable: InMemoryTable<{ kind: string; op: string }>;
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
      get dirtySync() {
        return dirtySyncTable;
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
  analyzeRepertoireConflict,
  pullRepertoireFromDrive,
  pushRepertoireToDrive,
  resolveConflictKeepLocal,
  resolveConflictUseRemoteThenPush,
  resolveConflictWithChoices,
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
  // Reset the drive-fetch once-queues too: clearAllMocks keeps queued mockResolvedValueOnce values,
  // so a test that throws before consuming them would leak the queue into the next test.
  (driveGetMedia as any).mockReset();
  (driveGetFileMetadata as any).mockReset();
  (drivePatchJsonMedia as any).mockReset();
  songsTable = makeTable<EncoreSong>();
  perfTable = makeTable<EncorePerformance>();
  extrasTable = makeTable<RepertoireExtrasRow>();
  dirtySyncTable = makeTable<{ kind: string; op: string }>();
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

    await pushRepertoireToDrive('tok', REPERTOIRE_FILE_ID, 'priorEtag', {
      writeGuard: { autoPushAllowed: true },
    });

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

  it('returns conflict=true and a row-level analysis when both local and remote changed', async () => {
    setLayoutOk();
    syncMetaState = {
      id: 'default',
      repertoireFileId: REPERTOIRE_FILE_ID,
      lastRemoteModified: '2025-06-01T00:00:00.000Z',
      lastSyncedLocalMaxUpdatedAt: '2025-05-01T00:00:00.000Z',
      lastRemoteEtag: 'priorEtag',
    };
    songsTable.rows = [
      song('s1', '2025-06-15T00:00:00.000Z', 'Local dirty s1'),
      song('s2', '2025-04-01T00:00:00.000Z', 'Untouched on both sides'),
    ];
    (driveGetFileMetadata as any).mockResolvedValueOnce({
      id: REPERTOIRE_FILE_ID,
      modifiedTime: '2025-06-10T00:00:00.000Z',
      etag: 'remoteEtag',
    });
    // Remote: s2 unchanged; remote-only s3 added; s1 untouched on remote (still old).
    (driveGetMedia as any).mockResolvedValueOnce(
      wirePayload(
        [
          song('s1', '2025-04-15T00:00:00.000Z', 'Old remote s1'),
          song('s2', '2025-04-01T00:00:00.000Z', 'Untouched on both sides'),
          song('s3', '2025-06-09T00:00:00.000Z', 'Remote-added s3'),
        ],
        [],
      ),
    );

    const r = await runInitialSyncIfPossible('tok');
    expect(r.ok).toBe(false);
    expect(r.conflict?.conflict).toBe(true);
    expect(r.conflict?.reason).toBe('local_and_remote_changed');
    expect(r.conflict?.remoteEtag).toBe('remoteEtag');
    expect(r.analysis).toBeDefined();
    expect(r.analysis!.localOnly.map((x) => x.id).sort()).toEqual(['s1']);
    expect(r.analysis!.remoteOnly.map((x) => x.id).sort()).toEqual(['s3']);
    expect(r.analysis!.bothEdited).toEqual([]);
    expect(drivePatchJsonMedia).not.toHaveBeenCalled();
  });

  it('returns analysis with bothEdited rows when local and remote both edit the same row', async () => {
    setLayoutOk();
    syncMetaState = {
      id: 'default',
      repertoireFileId: REPERTOIRE_FILE_ID,
      lastRemoteModified: '2025-06-01T00:00:00.000Z',
      lastSyncedLocalMaxUpdatedAt: '2025-05-01T00:00:00.000Z',
      lastRemoteEtag: 'priorEtag',
    };
    songsTable.rows = [song('s1', '2025-06-15T00:00:00.000Z', 'Local edit s1')];
    (driveGetFileMetadata as any).mockResolvedValueOnce({
      id: REPERTOIRE_FILE_ID,
      modifiedTime: '2025-06-10T00:00:00.000Z',
      etag: 'remoteEtag',
    });
    (driveGetMedia as any).mockResolvedValueOnce(
      wirePayload([song('s1', '2025-06-09T00:00:00.000Z', 'Remote edit s1')], []),
    );

    const r = await runInitialSyncIfPossible('tok');
    expect(r.ok).toBe(false);
    expect(r.analysis?.bothEdited.map((x) => x.id)).toEqual(['s1']);
    expect(r.analysis?.localOnly).toEqual([]);
    expect(r.analysis?.remoteOnly).toEqual([]);
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

describe('analyzeRepertoireConflict', () => {
  const meta = {
    lastSyncedLocalMaxUpdatedAt: '2025-05-01T00:00:00.000Z',
    lastRemoteModified: '2025-05-01T00:00:00.000Z',
  };

  it('classifies rows into localOnly, remoteOnly, and bothEdited buckets', () => {
    const local = {
      songs: [
        song('local-only', '2025-06-01T00:00:00.000Z'), // edited locally, not on remote
        song('shared-local-newer', '2025-06-10T00:00:00.000Z'), // both edited
        song('quiet', '2025-04-01T00:00:00.000Z'), // unchanged on both sides
      ],
      performances: [],
    };
    const remote = {
      songs: [
        song('shared-local-newer', '2025-06-09T00:00:00.000Z'), // both edited
        song('remote-only', '2025-06-02T00:00:00.000Z'), // edited remotely, not local
        song('quiet', '2025-04-01T00:00:00.000Z'), // unchanged on both sides
      ],
      performances: [],
    };

    const a = analyzeRepertoireConflict(local, remote, meta);
    expect(a.localOnly.map((x) => x.id)).toEqual(['local-only']);
    expect(a.remoteOnly.map((x) => x.id)).toEqual(['remote-only']);
    expect(a.bothEdited.map((x) => x.id)).toEqual(['shared-local-newer']);
  });

  it('treats identical updatedAt rows as in-sync (no entries in any bucket)', () => {
    const local = { songs: [song('s1', '2025-06-01T00:00:00.000Z')], performances: [] };
    const remote = { songs: [song('s1', '2025-06-01T00:00:00.000Z')], performances: [] };
    const a = analyzeRepertoireConflict(local, remote, meta);
    expect(a.localOnly).toEqual([]);
    expect(a.remoteOnly).toEqual([]);
    expect(a.bothEdited).toEqual([]);
  });

  it('classifies performances by id with the same rules', () => {
    const local = {
      songs: [song('s1', '2025-04-01T00:00:00.000Z')],
      performances: [perf('p1', 's1', '2025-06-10T00:00:00.000Z')],
    };
    const remote = {
      songs: [song('s1', '2025-04-01T00:00:00.000Z')],
      performances: [perf('p2', 's1', '2025-06-09T00:00:00.000Z')],
    };
    const a = analyzeRepertoireConflict(local, remote, meta);
    expect(a.localOnly.map((x) => `${x.kind}:${x.id}`)).toEqual(['performance:p1']);
    expect(a.remoteOnly.map((x) => `${x.kind}:${x.id}`)).toEqual(['performance:p2']);
  });
});

describe('resolveConflictWithChoices', () => {
  function setupConflictForChoice() {
    syncMetaState = {
      id: 'default',
      repertoireFileId: REPERTOIRE_FILE_ID,
      lastRemoteModified: '2025-05-01T00:00:00.000Z',
      lastSyncedLocalMaxUpdatedAt: '2025-05-01T00:00:00.000Z',
      lastRemoteEtag: 'priorEtag',
    };
    songsTable.rows = [
      song('s1', '2025-06-10T00:00:00.000Z', 'Local s1'),
      song('s2', '2025-06-01T00:00:00.000Z', 'Local s2 (newer than remote)'),
    ];
    (driveGetMedia as any).mockResolvedValueOnce(
      wirePayload(
        [
          song('s1', '2025-06-09T00:00:00.000Z', 'Remote s1'),
          song('s2', '2025-04-01T00:00:00.000Z', 'Remote s2 (older)'),
          song('s3', '2025-05-15T00:00:00.000Z', 'Remote-only s3'),
        ],
        [],
      ),
    );
    (drivePatchJsonMedia as any).mockResolvedValueOnce({
      id: REPERTOIRE_FILE_ID,
      modifiedTime: '2025-06-15T00:00:00.000Z',
      etag: 'merged-etag',
    });
    (driveGetFileMetadata as any).mockResolvedValueOnce({
      id: REPERTOIRE_FILE_ID,
      modifiedTime: '2025-06-15T00:00:00.000Z',
      etag: 'merged-etag',
    });
  }

  it('keeps local for "local" choice (and bumps its updatedAt past remote)', async () => {
    setupConflictForChoice();
    await resolveConflictWithChoices('tok', new Map([['s1', 'local']]));

    const s1 = songsTable.rows.find((s) => s.id === 's1')!;
    expect(s1.title).toBe('Local s1');
    expect(s1.updatedAt > '2025-06-09T00:00:00.000Z').toBe(true);
    // Auto-merged rows: s2 (local newer wins), s3 (remote-only added).
    expect(songsTable.rows.find((s) => s.id === 's2')!.title).toBe('Local s2 (newer than remote)');
    expect(songsTable.rows.find((s) => s.id === 's3')!.title).toBe('Remote-only s3');
  });

  it('uses remote row verbatim for "remote" choice', async () => {
    setupConflictForChoice();
    await resolveConflictWithChoices('tok', new Map([['s1', 'remote']]));
    const s1 = songsTable.rows.find((s) => s.id === 's1')!;
    expect(s1.title).toBe('Remote s1');
  });

  it('falls back to newer-wins when no choice is supplied (silent auto-merge)', async () => {
    setupConflictForChoice();
    await resolveConflictWithChoices('tok', new Map());
    const s1 = songsTable.rows.find((s) => s.id === 's1')!;
    expect(s1.title).toBe('Local s1'); // local is newer
    expect(songsTable.rows.find((s) => s.id === 's3')).toBeDefined();
  });

  it('pushes the merged result without an If-Match etag', async () => {
    setupConflictForChoice();
    await resolveConflictWithChoices('tok', new Map([['s1', 'local']]));
    const [, , , ifMatch] = (drivePatchJsonMedia as any).mock.calls[0];
    expect(ifMatch).toBeUndefined();
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

describe('P0 sync data-loss cluster', () => {
  function wireWithExtras(
    songs: EncoreSong[],
    performances: EncorePerformance[],
    extras: Partial<RepertoireWirePayload> = {},
  ): string {
    const wire: RepertoireWirePayload = {
      version: 1,
      exportedAt: '2025-06-01T00:00:00.000Z',
      songs,
      performances,
      venueCatalog: [],
      milestoneTemplate: [],
      ...extras,
    };
    return JSON.stringify(wire);
  }

  function meta(modifiedTime: string, etag = 'etagX') {
    return { id: REPERTOIRE_FILE_ID, modifiedTime, etag };
  }

  describe('song/performance delete tombstones (P0-1, clocked)', () => {
    it('a locally-deleted song is not resurrected by a remote copy on pull', async () => {
      // Local device deleted s1 at 2025-06-02 (after the row's clock); remote still lists it.
      extrasTable.rows = [
        { id: 'default', venueCatalog: [], milestoneTemplate: [], deletedSongIds: { s1: '2025-06-02T00:00:00.000Z' }, updatedAt: '2025-06-02T00:00:00.000Z' },
      ];
      (driveGetMedia as any).mockResolvedValueOnce(
        wireWithExtras([song('s1', '2025-05-01T00:00:00.000Z'), song('s2', '2025-05-01T00:00:00.000Z')], []),
      );
      (driveGetFileMetadata as any).mockResolvedValueOnce(meta('2025-06-01T01:00:00.000Z'));

      await pullRepertoireFromDrive('tok', REPERTOIRE_FILE_ID);

      expect(songsTable.rows.map((s) => s.id)).toEqual(['s2']);
    });

    it('a locally-deleted performance is not resurrected by a remote copy on pull', async () => {
      extrasTable.rows = [
        { id: 'default', venueCatalog: [], milestoneTemplate: [], deletedPerformanceIds: { p1: '2025-06-02T00:00:00.000Z' }, updatedAt: '2025-06-02T00:00:00.000Z' },
      ];
      (driveGetMedia as any).mockResolvedValueOnce(
        wireWithExtras([], [perf('p1', 's1', '2025-05-01T00:00:00.000Z'), perf('p2', 's1', '2025-05-01T00:00:00.000Z')]),
      );
      (driveGetFileMetadata as any).mockResolvedValueOnce(meta('2025-06-01T01:00:00.000Z'));

      await pullRepertoireFromDrive('tok', REPERTOIRE_FILE_ID);

      expect(perfTable.rows.map((p) => p.id)).toEqual(['p2']);
    });

    it('a remote tombstone removes a row this device still holds (delete propagates back)', async () => {
      songsTable.rows = [song('s1', '2025-05-01T00:00:00.000Z')];
      (driveGetMedia as any).mockResolvedValueOnce(
        wireWithExtras([], [], { deletedSongIds: { s1: '2025-06-02T00:00:00.000Z' } }),
      );
      (driveGetFileMetadata as any).mockResolvedValueOnce(meta('2025-06-01T01:00:00.000Z'));

      await pullRepertoireFromDrive('tok', REPERTOIRE_FILE_ID);

      expect(songsTable.rows.map((s) => s.id)).toEqual([]);
    });

    it('B1: a song restored (bumped clock) after its tombstone survives on a peer that still holds the tombstone', async () => {
      // Peer B still carries the tombstone for s1 (deleted at 2025-06-02). Device A restored s1 via
      // undo, bumping its updatedAt to 2025-07-10 (> tombstone) and pushing it in the wire.
      extrasTable.rows = [
        { id: 'default', venueCatalog: [], milestoneTemplate: [], deletedSongIds: { s1: '2025-06-02T00:00:00.000Z' }, updatedAt: '2025-06-02T00:00:00.000Z' },
      ];
      (driveGetMedia as any).mockResolvedValueOnce(
        wireWithExtras([song('s1', '2025-07-10T00:00:00.000Z', 'Restored')], []),
      );
      (driveGetFileMetadata as any).mockResolvedValueOnce(meta('2025-07-10T01:00:00.000Z'));

      await pullRepertoireFromDrive('tok', REPERTOIRE_FILE_ID);

      // The restored row's newer clock supersedes the stale tombstone — no silent cross-device loss.
      expect(songsTable.rows.map((s) => s.id)).toEqual(['s1']);
      expect(songsTable.rows[0].title).toBe('Restored');
    });
  });

  describe('performance video union on pull (P0-3)', () => {
    it('unions videos so a video logged on another device is not dropped by a newer sparse copy', async () => {
      const local: EncorePerformance = {
        ...perf('p1', 's1', '2025-05-01T00:00:00.000Z'),
        videos: [{ id: 'v-local', externalVideoUrl: 'http://a', createdAt: '2025-05-01T00:00:00.000Z' }],
      };
      songsTable.rows = [];
      perfTable.rows = [local];
      // Remote is NEWER but only carries a different single video (the sparse-newer clobber case).
      const remote: EncorePerformance = {
        ...perf('p1', 's1', '2025-06-01T00:00:00.000Z'),
        videos: [{ id: 'v-remote', externalVideoUrl: 'http://b', createdAt: '2025-06-01T00:00:00.000Z' }],
      };
      (driveGetMedia as any).mockResolvedValueOnce(wireWithExtras([], [remote]));
      (driveGetFileMetadata as any).mockResolvedValueOnce(meta('2025-06-01T01:00:00.000Z'));

      await pullRepertoireFromDrive('tok', REPERTOIRE_FILE_ID);

      const merged = perfTable.rows.find((p) => p.id === 'p1')!;
      expect((merged.videos ?? []).map((v) => v.id).sort()).toEqual(['v-local', 'v-remote']);
    });
  });

  describe('auto-push gate (P0-2)', () => {
    it('refuses an auto-push when no reconciling pull happened this session', async () => {
      await expect(
        pushRepertoireToDrive('tok', REPERTOIRE_FILE_ID, undefined, {
          writeGuard: { autoPushAllowed: false },
        }),
      ).rejects.toThrow(/paused until this device syncs/i);
      expect(drivePatchJsonMedia).not.toHaveBeenCalled();
    });

    it('allows a push once the reconciling pull has succeeded', async () => {
      songsTable.rows = [song('s1', '2025-05-01T00:00:00.000Z')];
      (drivePatchJsonMedia as any).mockResolvedValueOnce(meta('2025-06-01T00:00:00.000Z', 'p'));
      (driveGetFileMetadata as any).mockResolvedValueOnce(meta('2025-06-01T00:00:01.000Z', 'm'));

      await pushRepertoireToDrive('tok', REPERTOIRE_FILE_ID, 'etag', {
        writeGuard: { autoPushAllowed: true },
      });

      expect(drivePatchJsonMedia).toHaveBeenCalledTimes(1);
    });

    it('allows an explicit user-confirmed replace even before a pull', async () => {
      songsTable.rows = [song('s1', '2025-05-01T00:00:00.000Z')];
      (drivePatchJsonMedia as any).mockResolvedValueOnce(meta('2025-06-01T00:00:00.000Z', 'p'));
      (driveGetFileMetadata as any).mockResolvedValueOnce(meta('2025-06-01T00:00:01.000Z', 'm'));

      await pushRepertoireToDrive('tok', REPERTOIRE_FILE_ID, undefined, {
        writeGuard: { autoPushAllowed: false, intentionalReplace: true },
      });

      expect(drivePatchJsonMedia).toHaveBeenCalledTimes(1);
    });
  });
});
