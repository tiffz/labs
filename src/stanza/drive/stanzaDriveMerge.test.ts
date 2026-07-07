import { describe, expect, it } from 'vitest';
import type { StanzaSong } from '../db/stanzaDb';
import type { StanzaSongDriveRow } from './stanzaDriveEnvelope';
import {
  applyStanzaConflictChoices,
  mergeDriveRowsIntoLocalLibrary,
  stanzaSongFromDriveRow,
} from './stanzaDriveMerge';

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

  it('prefers local when updatedAt is newer but still takes richer remote markers', () => {
    const local = [song({ id: '1', title: 'Local', updatedAt: 20, markers: [{ time: 1, label: 'L' }] })];
    const remote: StanzaSongDriveRow[] = [
      {
        id: '1',
        ytId: 'yt',
        title: 'Remote',
        markers: [{ time: 2, label: 'R' }, { time: 40, label: 'R2' }],
        stats: {},
        updatedAt: 10,
      },
    ];
    const { nextRows, report } = mergeDriveRowsIntoLocalLibrary(local, remote);
    expect(report.mergedPreferLocal).toBe(1);
    expect(nextRows[0].title).toBe('Local');
    expect(nextRows[0].markers).toHaveLength(2);
    expect(nextRows[0].markers[1]?.label).toBe('R2');
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

  it('keeps local section markers when remote is newer but has none', () => {
    const local = [
      song({
        id: '1',
        ytId: 'vid',
        title: 'Sectioned',
        updatedAt: 5,
        markers: [
          { id: 'm1', time: 10, label: 'Intro' },
          { id: 'm2', time: 40, label: 'Chorus' },
          { id: 'm3', time: 80, label: 'Bridge' },
        ],
      }),
    ];
    const remote: StanzaSongDriveRow[] = [
      {
        id: '1',
        ytId: 'vid',
        title: 'Mix tweak only',
        markers: [],
        stats: {},
        updatedAt: 500,
        primaryGain: 0.5,
      },
    ];
    const { nextRows, report } = mergeDriveRowsIntoLocalLibrary(local, remote);
    expect(report.mergedPreferRemote).toBe(1);
    expect(report.markersRecoveredFromLocal).toBe(1);
    expect(nextRows[0].markers).toHaveLength(3);
    expect(nextRows[0].title).toBe('Mix tweak only');
    expect(nextRows[0].primaryGain).toBe(0.5);
  });

  it('materializes remote-only stems with driveFileId for later hydration', () => {
    const remote: StanzaSongDriveRow[] = [
      {
        id: '1',
        ytId: null,
        title: 'Local',
        markers: [],
        stats: {},
        updatedAt: 10,
        driveSourceFileId: 'main-file',
        stems: [{ id: 'st1', label: 'Backing', driveFileId: 'stem-drive-1' }],
      },
    ];
    const { nextRows } = mergeDriveRowsIntoLocalLibrary([], remote);
    expect(nextRows[0].stems).toHaveLength(1);
    expect(nextRows[0].stems?.[0].driveFileId).toBe('stem-drive-1');
    expect(nextRows[0].stems?.[0].localBlob.size).toBe(0);
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

  it('merges remote stem driveFileId when local row wins on updatedAt', () => {
    const local = [
      song({
        id: '1',
        ytId: null,
        title: 'Local upload',
        updatedAt: 200,
        localAudioBlob: new Blob(['main'], { type: 'audio/mpeg' }),
        localMediaFingerprint: '100:120.00',
        stems: [{ id: 'st1', label: 'Layer', localBlob: new Blob([], { type: 'audio/wav' }) }],
      }),
    ];
    const remote: StanzaSongDriveRow[] = [
      {
        id: '1',
        ytId: null,
        title: 'Local upload',
        markers: [],
        stats: {},
        updatedAt: 100,
        localMediaFingerprint: '100:120.00',
        stems: [{ id: 'st1', label: 'Layer', driveFileId: 'stem-drive-9' }],
      },
    ];
    const { nextRows } = mergeDriveRowsIntoLocalLibrary(local, remote);
    expect(nextRows[0].stems?.[0].driveFileId).toBe('stem-drive-9');
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

  it('merges local-only remote metadata onto a matching local file fingerprint', () => {
    const blob = new Blob([new Uint8Array(128)], { type: 'video/mp4' });
    const fp = '128:180.00';
    const local = [
      song({
        id: 'device-b',
        title: 'Clip',
        updatedAt: 50,
        localAudioBlob: blob,
        localMediaFingerprint: fp,
      }),
    ];
    const remote: StanzaSongDriveRow[] = [
      {
        id: 'device-a',
        ytId: null,
        title: 'Clip',
        markers: [{ time: 12, label: 'verse' }],
        stats: {},
        updatedAt: 100,
        localMediaFingerprint: fp,
      },
    ];
    const { nextRows, report } = mergeDriveRowsIntoLocalLibrary(local, remote);
    expect(nextRows).toHaveLength(1);
    expect(report.mergedPreferRemote).toBe(1);
    expect(nextRows[0]?.id).toBe('device-b');
    expect(nextRows[0]?.markers).toHaveLength(1);
    expect(nextRows[0]?.markers[0]?.label).toBe('verse');
  });

  it('merges remote mix layers onto a local file with a compatible fingerprint', () => {
    const blob = new Blob([new Uint8Array(200)], { type: 'audio/mpeg' });
    const local = [
      song({
        id: 'device-b',
        title: 'Blue',
        updatedAt: 50,
        localAudioBlob: blob,
        localMediaFingerprint: '200:240.00',
      }),
    ];
    const remote: StanzaSongDriveRow[] = [
      {
        id: 'device-a',
        ytId: null,
        title: 'Blue',
        markers: [],
        stats: {},
        updatedAt: 100,
        localMediaFingerprint: '200:name:blue.mp3',
        stems: [{ id: 'st1', label: 'lead vocals', driveFileId: 'stem-1' }],
      },
    ];
    const { nextRows } = mergeDriveRowsIntoLocalLibrary(local, remote);
    expect(nextRows).toHaveLength(1);
    expect(nextRows[0]?.stems).toHaveLength(1);
    expect(nextRows[0]?.stems?.[0].driveFileId).toBe('stem-1');
  });

  it('materializes practice metadata with stems when the main file is not on this device yet', () => {
    const remote: StanzaSongDriveRow[] = [
      {
        id: 'device-a',
        ytId: null,
        title: 'Blue',
        markers: [],
        stats: {},
        updatedAt: 100,
        localMediaFingerprint: '200:240.00',
        stems: [
          { id: 'st1', label: 'lead vocals', driveFileId: 'stem-1' },
          { id: 'st2', label: 'backing vocals', driveFileId: 'stem-2' },
        ],
      },
    ];
    const { nextRows, report } = mergeDriveRowsIntoLocalLibrary([], remote);
    expect(report.addedFromRemote).toBe(1);
    expect(nextRows[0]?.stems).toHaveLength(2);
    expect(nextRows[0]?.stems?.[0].driveFileId).toBe('stem-1');
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

  it('keeps local drumPattern when remote wins metadata but remote has no pattern', () => {
    const local = [
      song({
        id: '1',
        ytId: 'vid',
        title: 'Local',
        updatedAt: 5,
        drumPattern: 'D-T-K-T-',
      }),
    ];
    const remote: StanzaSongDriveRow[] = [
      {
        id: '1',
        ytId: 'vid',
        title: 'Remote mix tweak',
        markers: [],
        stats: {},
        updatedAt: 100,
        primaryGain: 0.8,
      },
    ];
    const { nextRows } = mergeDriveRowsIntoLocalLibrary(local, remote);
    expect(nextRows[0].drumPattern).toBe('D-T-K-T-');
  });

  it('keeps local drumsEnabled when remote wins with explicit false', () => {
    const local = [
      song({
        id: '1',
        ytId: 'vid',
        title: 'Local',
        updatedAt: 5,
        drumsEnabled: true,
      }),
    ];
    const remote: StanzaSongDriveRow[] = [
      {
        id: '1',
        ytId: 'vid',
        title: 'Remote mix tweak',
        markers: [],
        stats: {},
        updatedAt: 100,
        drumsEnabled: false,
      },
    ];
    const { nextRows } = mergeDriveRowsIntoLocalLibrary(local, remote);
    expect(nextRows[0].drumsEnabled).toBe(true);
  });

  it('prefers local drumPattern when local updatedAt wins richer merge', () => {
    const local = [
      song({
        id: '1',
        ytId: 'vid',
        title: 'Local',
        updatedAt: 200,
        drumPattern: 'D---D---',
      }),
    ];
    const remote: StanzaSongDriveRow[] = [
      {
        id: '1',
        ytId: 'vid',
        title: 'Remote',
        markers: [],
        stats: {},
        updatedAt: 10,
        drumPattern: 'D-T-K-T-',
      },
    ];
    const { nextRows } = mergeDriveRowsIntoLocalLibrary(local, remote);
    expect(nextRows[0].drumPattern).toBe('D---D---');
  });
});

describe('applyStanzaConflictChoices', () => {
  it('keeps local song when choice is local and remote when choice is remote', () => {
    const local = [
      {
        id: 'a',
        ytId: 'vid-a',
        title: 'Local A',
        markers: [{ id: 'm1', time: 1, label: 'L' }],
        stats: {},
        updatedAt: 100,
      },
      {
        id: 'b',
        ytId: 'vid-b',
        title: 'Local B',
        markers: [],
        stats: {},
        updatedAt: 100,
      },
    ];
    const remote = [
      {
        id: 'a',
        ytId: 'vid-a',
        title: 'Remote A',
        markers: [{ id: 'm2', time: 2, label: 'R' }],
        stats: {},
        updatedAt: 200,
      },
      {
        id: 'b',
        ytId: 'vid-b',
        title: 'Remote B',
        markers: [{ id: 'm3', time: 3, label: 'R' }],
        stats: {},
        updatedAt: 200,
      },
    ];
    const choices = new Map<string, 'local' | 'remote'>([
      ['a', 'local'],
      ['b', 'remote'],
    ]);
    const { nextRows } = applyStanzaConflictChoices({
      localRows: local as never,
      remoteSongs: remote as never,
      choices,
    });
    const byId = new Map(nextRows.map((r) => [r.id, r]));
    expect(byId.get('a')?.title).toBe('Local A');
    expect(byId.get('a')?.markers).toHaveLength(1);
    expect(byId.get('b')?.title).toBe('Remote B');
    expect(byId.get('b')?.markers).toHaveLength(1);
  });
});
