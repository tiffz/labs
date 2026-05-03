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
