import { describe, expect, it } from 'vitest';
import type { StanzaSong } from '../db/stanzaDb';
import type { StanzaSongDriveRow } from './stanzaDriveEnvelope';
import { mergeDriveRowsIntoLocalLibrary, stanzaSongFromDriveRow } from './stanzaDriveMerge';

function song(p: Partial<StanzaSong> & Pick<StanzaSong, 'id' | 'title' | 'updatedAt'>): StanzaSong {
  return {
    ytId: null,
    markers: [],
    stats: {},
    ...p,
  };
}

describe('stanzaSongFromDriveRow', () => {
  it('returns YouTube-backed row', () => {
    const row: StanzaSongDriveRow = {
      id: 'a',
      ytId: 'abc',
      title: 'T',
      markers: [],
      stats: {},
      updatedAt: 1,
    };
    const s = stanzaSongFromDriveRow(row);
    expect(s?.ytId).toBe('abc');
  });

  it('returns Drive-linked row when driveSourceFileId set', () => {
    const row: StanzaSongDriveRow = {
      id: 'b',
      ytId: null,
      title: 'L',
      markers: [],
      stats: {},
      updatedAt: 2,
      driveSourceFileId: 'file123',
    };
    const s = stanzaSongFromDriveRow(row);
    expect(s?.driveSourceFileId).toBe('file123');
  });

  it('returns null for local-only remote row', () => {
    const row: StanzaSongDriveRow = {
      id: 'c',
      ytId: null,
      title: 'X',
      markers: [],
      stats: {},
      updatedAt: 3,
    };
    expect(stanzaSongFromDriveRow(row)).toBeNull();
  });
});

describe('mergeDriveRowsIntoLocalLibrary', () => {
  it('keeps local-only songs', () => {
    const local = [song({ id: '1', title: 'A', updatedAt: 10 })];
    const { nextRows, report } = mergeDriveRowsIntoLocalLibrary(local, []);
    expect(nextRows).toHaveLength(1);
    expect(report.keptLocalOnly).toBe(1);
  });

  it('prefers local when updatedAt is newer', () => {
    const local = [song({ id: '1', title: 'Local', updatedAt: 20, markers: [{ time: 1, label: 'L' }] })];
    const remote: StanzaSongDriveRow[] = [
      {
        id: '1',
        ytId: 'yt',
        title: 'Remote',
        markers: [{ time: 2, label: 'R' }],
        stats: {},
        updatedAt: 10,
      },
    ];
    const { nextRows, report } = mergeDriveRowsIntoLocalLibrary(local, remote);
    expect(report.mergedPreferLocal).toBe(1);
    expect(nextRows[0].title).toBe('Local');
    expect(nextRows[0].markers[0].label).toBe('L');
  });

  it('takes remote metadata when remote is newer and keeps local blobs', () => {
    const blob = new Blob(['x'], { type: 'audio/wav' });
    const thumb = new Blob(['t'], { type: 'image/jpeg' });
    const local = [
      song({
        id: '1',
        ytId: 'vid',
        title: 'Old title',
        updatedAt: 5,
        markers: [],
        localAudioBlob: blob,
        localVideoThumbnailBlob: thumb,
      }),
    ];
    const remote: StanzaSongDriveRow[] = [
      {
        id: '1',
        ytId: 'vid',
        title: 'New title',
        markers: [{ time: 1, label: 'm' }],
        stats: {},
        updatedAt: 50,
      },
    ];
    const { nextRows, report } = mergeDriveRowsIntoLocalLibrary(local, remote);
    expect(report.mergedPreferRemote).toBe(1);
    expect(nextRows[0].title).toBe('New title');
    expect(nextRows[0].markers[0].label).toBe('m');
    expect(nextRows[0].localAudioBlob).toBe(blob);
    expect(nextRows[0].localVideoThumbnailBlob).toBe(thumb);
  });

  it('merges stem blobs by id when remote wins', () => {
    const stemBlob = new Blob(['s'], { type: 'audio/wav' });
    const local = [
      song({
        id: '1',
        ytId: 'v',
        title: 'S',
        updatedAt: 1,
        stems: [{ id: 'st1', label: 'Stem', localBlob: stemBlob }],
      }),
    ];
    const remote: StanzaSongDriveRow[] = [
      {
        id: '1',
        ytId: 'v',
        title: 'S2',
        markers: [],
        stats: {},
        updatedAt: 99,
        stems: [{ id: 'st1', label: 'Renamed', muted: true }],
      },
    ];
    const { nextRows } = mergeDriveRowsIntoLocalLibrary(local, remote);
    expect(nextRows[0].stems).toHaveLength(1);
    expect(nextRows[0].stems?.[0].label).toBe('Renamed');
    expect(nextRows[0].stems?.[0].muted).toBe(true);
    expect(nextRows[0].stems?.[0].localBlob).toBe(stemBlob);
  });

  it('adds remote-only YouTube song', () => {
    const remote: StanzaSongDriveRow[] = [
      {
        id: 'new',
        ytId: 'abc',
        title: 'YT',
        markers: [],
        stats: {},
        updatedAt: 1,
      },
    ];
    const { nextRows, report } = mergeDriveRowsIntoLocalLibrary([], remote);
    expect(report.addedFromRemote).toBe(1);
    expect(nextRows[0].ytId).toBe('abc');
  });

  it('skips unplayable remote-only rows', () => {
    const remote: StanzaSongDriveRow[] = [
      {
        id: 'orphan',
        ytId: null,
        title: 'No source',
        markers: [],
        stats: {},
        updatedAt: 1,
      },
    ];
    const { nextRows, report } = mergeDriveRowsIntoLocalLibrary([], remote);
    expect(nextRows).toHaveLength(0);
    expect(report.skippedRemoteOnlyUnplayable).toBe(1);
  });

  it('collapses two rows that share a ytId but have different ids (cross-device dedupe)', () => {
    // Local row was created on this device by an older addYoutubeSong (no dedupe by ytId).
    // Remote row was created on a different device for the same YouTube video. After auto-pull
    // both ids exist; the merge should converge to one card so the user doesn't see dupes.
    const local = [
      song({ id: 'local-uuid', ytId: 'shared-vid', title: 'Older title', updatedAt: 100 }),
    ];
    const remote: StanzaSongDriveRow[] = [
      {
        id: 'remote-uuid',
        ytId: 'shared-vid',
        title: 'Newer title from device B',
        markers: [],
        stats: {},
        updatedAt: 200,
      },
    ];
    const { nextRows, remappedIds, report } = mergeDriveRowsIntoLocalLibrary(local, remote);
    expect(nextRows).toHaveLength(1);
    expect(nextRows[0]?.id).toBe('remote-uuid');
    expect(nextRows[0]?.title).toBe('Newer title from device B');
    expect(report.collapsedByContentKey).toBe(1);
    expect(remappedIds.get('local-uuid')).toBe('remote-uuid');
  });

  it('collapses two Drive-imported rows with the same driveSourceFileId', () => {
    const local = [
      song({
        id: 'local-uuid',
        ytId: null,
        driveSourceFileId: 'drive-file-1',
        title: 'Local',
        updatedAt: 50,
      }),
    ];
    const remote: StanzaSongDriveRow[] = [
      {
        id: 'remote-uuid',
        ytId: null,
        driveSourceFileId: 'drive-file-1',
        title: 'Remote',
        markers: [],
        stats: {},
        updatedAt: 60,
      },
    ];
    const { nextRows, remappedIds } = mergeDriveRowsIntoLocalLibrary(local, remote);
    expect(nextRows).toHaveLength(1);
    expect(remappedIds.size).toBe(1);
  });

  describe('Drive deletion tombstones (ADR 0006)', () => {
    it('skips a remote-only Drive-backed row whose driveSourceFileId is tombstoned', () => {
      const remote: StanzaSongDriveRow[] = [
        {
          id: 'ghost',
          ytId: null,
          driveSourceFileId: 'drive-removed',
          title: 'Official Video',
          markers: [],
          stats: {},
          updatedAt: 1,
        },
      ];
      const { nextRows, report } = mergeDriveRowsIntoLocalLibrary([], remote, {
        tombstoneFileIds: new Set(['drive-removed']),
      });
      expect(nextRows).toHaveLength(0);
      expect(report.skippedTombstoned).toBe(1);
      expect(report.addedFromRemote).toBe(0);
    });

    it('still adds a remote-only row whose driveSourceFileId is NOT tombstoned', () => {
      const remote: StanzaSongDriveRow[] = [
        {
          id: 'fresh',
          ytId: null,
          driveSourceFileId: 'drive-keep',
          title: 'New',
          markers: [],
          stats: {},
          updatedAt: 1,
        },
      ];
      const { nextRows, report } = mergeDriveRowsIntoLocalLibrary([], remote, {
        tombstoneFileIds: new Set(['drive-other']),
      });
      expect(nextRows).toHaveLength(1);
      expect(report.addedFromRemote).toBe(1);
      expect(report.skippedTombstoned).toBe(0);
    });

    it('still adds a remote-only YouTube row (no driveSourceFileId) regardless of tombstones', () => {
      const remote: StanzaSongDriveRow[] = [
        { id: 'yt', ytId: 'abc', title: 'YT', markers: [], stats: {}, updatedAt: 1 },
      ];
      const { nextRows, report } = mergeDriveRowsIntoLocalLibrary([], remote, {
        tombstoneFileIds: new Set(['drive-removed']),
      });
      expect(nextRows).toHaveLength(1);
      expect(report.addedFromRemote).toBe(1);
    });

    it('marks a tombstone stale when a local row still has that driveSourceFileId', () => {
      const local = [
        song({
          id: 'local-uuid',
          ytId: null,
          driveSourceFileId: 'drive-readded',
          title: 'I re-added this',
          updatedAt: 100,
          localAudioBlob: new Blob(['x'], { type: 'audio/wav' }),
        }),
      ];
      const { nextRows, staleTombstoneFileIds } = mergeDriveRowsIntoLocalLibrary(local, [], {
        tombstoneFileIds: new Set(['drive-readded', 'drive-still-deleted']),
      });
      expect(nextRows).toHaveLength(1);
      expect(staleTombstoneFileIds).toEqual(['drive-readded']);
    });

    it('returns no stale tombstones when no caller passed any', () => {
      const local = [
        song({
          id: 'local-uuid',
          ytId: null,
          driveSourceFileId: 'drive-readded',
          title: 'A',
          updatedAt: 100,
        }),
      ];
      const { staleTombstoneFileIds } = mergeDriveRowsIntoLocalLibrary(local, []);
      expect(staleTombstoneFileIds).toEqual([]);
    });
  });
});
