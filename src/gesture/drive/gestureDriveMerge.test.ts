import { describe, expect, it } from 'vitest';
import { mergeGestureSyncPayload } from './gestureDriveMerge';

describe('mergeGestureSyncPayload', () => {
  it('merges draw history by file id', () => {
    const local = {
      packs: [],
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
    };
    const { payload } = mergeGestureSyncPayload(local, remote);
    expect(payload.packs[0]?.tags).toEqual(['gesture', 'study']);
    expect(payload.packs[0]?.subject).toBe('Hands');
  });
});
