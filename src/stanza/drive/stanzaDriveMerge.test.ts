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
});
