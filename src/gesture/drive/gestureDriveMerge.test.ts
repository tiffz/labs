import { describe, expect, it } from 'vitest';
import {
  formatGestureDriveMergeReport,
  gestureMergeReportHasUserVisibleRemoteChanges,
  mergeGestureSyncPayload,
} from './gestureDriveMerge';

describe('mergeGestureSyncPayload', () => {
  it('merges draw history by file id', () => {
    const local = {
      packs: [],
      packFiles: [],
      drawHistory: [
        {
          driveFileId: 'f1',
          packId: 'p1',
          firstDrawnAt: '2026-01-01T00:00:00.000Z',
          lastDrawnAt: '2026-01-02T00:00:00.000Z',
          totalMs: 60_000,
          sessionCount: 1,
        },
      ],
    };
    const remote = {
      packs: [],
      packFiles: [],
      drawHistory: [
        {
          driveFileId: 'f1',
          packId: 'p1',
          firstDrawnAt: '2025-12-31T00:00:00.000Z',
          lastDrawnAt: '2026-01-03T00:00:00.000Z',
          totalMs: 120_000,
          sessionCount: 2,
        },
      ],
    };
    const { payload } = mergeGestureSyncPayload(local, remote);
    expect(payload.drawHistory).toHaveLength(1);
    expect(payload.drawHistory[0]?.totalMs).toBe(180_000);
    expect(payload.drawHistory[0]?.sessionCount).toBe(3);
    expect(payload.drawHistory[0]?.firstDrawnAt).toBe('2025-12-31T00:00:00.000Z');
    expect(payload.drawHistory[0]?.lastDrawnAt).toBe('2026-01-03T00:00:00.000Z');
  });

  it('unions packs by drive folder id', () => {
    const local = {
      packs: [
        {
          id: 'local-id',
          driveFolderId: 'folder-a',
          name: 'Hands local',
          linkedAt: '2026-01-01T00:00:00.000Z',
          lastIndexedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      drawHistory: [],
      packFiles: [],
    };
    const remote = {
      packs: [
        {
          id: 'remote-id',
          driveFolderId: 'folder-b',
          name: 'Feet',
          linkedAt: '2026-01-02T00:00:00.000Z',
          lastIndexedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
      drawHistory: [],
      packFiles: [],
    };
    const { payload, report } = mergeGestureSyncPayload(local, remote);
    expect(payload.packs).toHaveLength(2);
    expect(report.packsFromRemoteOnly).toBe(1);
  });

  it('unions pack tags when merging', () => {
    const local = {
      packs: [
        {
          id: 'local-id',
          driveFolderId: 'folder-a',
          name: 'Hands local',
          linkedAt: '2026-01-01T00:00:00.000Z',
          lastIndexedAt: '2026-01-02T00:00:00.000Z',
          tags: ['gesture'],
          notes: 'Local note',
        },
      ],
      drawHistory: [],
      packFiles: [],
    };
    const remote = {
      packs: [
        {
          id: 'remote-id',
          driveFolderId: 'folder-a',
          name: 'Hands remote',
          linkedAt: '2026-01-01T00:00:00.000Z',
          lastIndexedAt: '2026-01-03T00:00:00.000Z',
          tags: ['study'],
          subject: 'Hands',
        },
      ],
      drawHistory: [],
      packFiles: [],
    };
    const { payload } = mergeGestureSyncPayload(local, remote);
    expect(payload.packs[0]?.tags).toEqual(['gesture', 'study']);
    expect(payload.packs[0]?.subject).toBe('Hands');
  });

  it('strips ephemeral upload fields from remote-only packs', () => {
    const { payload } = mergeGestureSyncPayload(
      { packs: [], packFiles: [], drawHistory: [] },
      {
        packs: [
          {
            id: 'remote-id',
            driveFolderId: 'folder-b',
            name: 'MistyMountains (2)',
            linkedAt: '2026-01-01T00:00:00.000Z',
            lastIndexedAt: '2026-01-02T00:00:00.000Z',
            uploadStatus: 'incomplete',
            expectedFileCount: 128,
            uploadedFileCount: 71,
            uploadSourceFolderName: 'MistyMountains',
          },
        ],
        packFiles: [],
        drawHistory: [],
      },
    );
    expect(payload.packs[0]?.name).toBe('MistyMountains (2)');
    expect(payload.packs[0]?.uploadStatus).toBeUndefined();
    expect(payload.packs[0]?.expectedFileCount).toBeUndefined();
  });

  it('remaps local pack file rows when pack ids differ but folder matches', () => {
    const localFiles = Array.from({ length: 700 }, (_, index) => ({
      driveFileId: `local-photo-${index}`,
      packId: 'old-local-id',
      name: `photo-${index}.jpg`,
      mimeType: 'image/jpeg',
    }));
    const local = {
      packs: [
        {
          id: 'old-local-id',
          driveFolderId: 'folder-a',
          name: 'Hattie in Motion',
          linkedAt: '2026-01-01T00:00:00.000Z',
          lastIndexedAt: '2026-01-03T00:00:00.000Z',
        },
      ],
      packFiles: localFiles,
      drawHistory: [],
    };
    const remote = {
      packs: [
        {
          id: 'remote-id',
          driveFolderId: 'folder-a',
          name: 'Hattie in Motion',
          linkedAt: '2026-01-01T00:00:00.000Z',
          lastIndexedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
      packFiles: Array.from({ length: 10 }, (_, index) => ({
        driveFileId: `remote-photo-${index}`,
        packId: 'remote-id',
        name: `remote-${index}.jpg`,
        mimeType: 'image/jpeg',
      })),
      drawHistory: [],
    };
    const { payload } = mergeGestureSyncPayload(local, remote);
    expect(payload.packFiles).toHaveLength(710);
    expect(payload.packFiles.every((row) => row.packId === 'old-local-id')).toBe(true);
  });

  it('remaps remote pack file rows to merged pack ids', () => {
    const local = {
      packs: [
        {
          id: 'local-id',
          driveFolderId: 'folder-a',
          name: 'Cats',
          linkedAt: '2026-01-01T00:00:00.000Z',
          lastIndexedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      packFiles: [],
      drawHistory: [],
    };
    const remote = {
      packs: [
        {
          id: 'remote-id',
          driveFolderId: 'folder-a',
          name: 'Cats',
          linkedAt: '2026-01-01T00:00:00.000Z',
          lastIndexedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
      packFiles: [
        {
          driveFileId: 'photo-1',
          packId: 'remote-id',
          name: 'a.jpg',
          mimeType: 'image/jpeg',
        },
      ],
      drawHistory: [],
    };
    const { payload } = mergeGestureSyncPayload(local, remote);
    expect(payload.packFiles).toHaveLength(1);
    expect(payload.packFiles[0]?.packId).toBe('local-id');
  });

  it('does not resurrect tombstoned remote collections', () => {
    const { payload } = mergeGestureSyncPayload(
      { packs: [], packFiles: [], drawHistory: [] },
      {
        packs: [
          {
            id: 'remote-id',
            driveFolderId: 'folder-b',
            name: 'Feet',
            linkedAt: '2026-01-02T00:00:00.000Z',
            lastIndexedAt: '2026-01-02T00:00:00.000Z',
          },
        ],
        packFiles: [],
        drawHistory: [],
      },
      { tombstonedFolderIds: new Set(['folder-b']) },
    );
    expect(payload.packs).toHaveLength(0);
  });

  it('drops local collections tombstoned on this device', () => {
    const { payload } = mergeGestureSyncPayload(
      {
        packs: [
          {
            id: 'local-id',
            driveFolderId: 'folder-a',
            name: 'Hands',
            linkedAt: '2026-01-01T00:00:00.000Z',
            lastIndexedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        packFiles: [],
        drawHistory: [],
      },
      null,
      { tombstonedFolderIds: new Set(['folder-a']) },
    );
    expect(payload.packs).toHaveLength(0);
  });

  it('does not toast overlap-only merge as user-visible remote changes', () => {
    const payload = {
      packs: [
        {
          id: 'same-id',
          driveFolderId: 'folder-a',
          name: 'Hands',
          linkedAt: '2026-01-01T00:00:00.000Z',
          lastIndexedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      packFiles: [],
      drawHistory: [],
    };
    const { report } = mergeGestureSyncPayload(payload, payload);
    expect(report.packsMerged).toBe(1);
    expect(report.packsUpdatedFromRemote).toBe(0);
    expect(formatGestureDriveMergeReport(report)).toBe('already in sync');
    expect(gestureMergeReportHasUserVisibleRemoteChanges(report)).toBe(false);
  });

  it('reports pack metadata updated from Drive', () => {
    const local = {
      packs: [
        {
          id: 'local-id',
          driveFolderId: 'folder-a',
          name: 'Hands local',
          linkedAt: '2026-01-01T00:00:00.000Z',
          lastIndexedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      packFiles: [],
      drawHistory: [],
    };
    const remote = {
      packs: [
        {
          id: 'remote-id',
          driveFolderId: 'folder-a',
          name: 'Hands remote',
          linkedAt: '2026-01-01T00:00:00.000Z',
          lastIndexedAt: '2026-01-03T00:00:00.000Z',
        },
      ],
      packFiles: [],
      drawHistory: [],
    };
    const { report } = mergeGestureSyncPayload(local, remote);
    expect(report.packsUpdatedFromRemote).toBe(1);
    expect(formatGestureDriveMergeReport(report)).toBe('updated 1 pack from Drive');
    expect(gestureMergeReportHasUserVisibleRemoteChanges(report)).toBe(true);
  });
});
