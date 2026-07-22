import { describe, expect, it } from 'vitest';
import type { StanzaSong } from '../db/stanzaDb';
import { consolidateStanzaSongDuplicates, stanzaSongContentKey } from './stanzaSongDeduplication';

function song(overrides: Partial<StanzaSong> & { id: string }): StanzaSong {
  return {
    ytId: null,
    title: 'Untitled',
    markers: [],
    stats: {},
    updatedAt: 0,
    ...overrides,
  } as StanzaSong;
}

describe('stanzaSongContentKey', () => {
  it('keys YouTube rows by ytId', () => {
    expect(stanzaSongContentKey({ id: 'a', title: 'Song', ytId: 'abc123', driveSourceFileId: undefined })).toBe('yt:abc123');
  });

  it('keys Drive-imported rows by driveSourceFileId', () => {
    expect(stanzaSongContentKey({ id: 'a', title: 'Song', ytId: null, driveSourceFileId: 'fileX' })).toBe('drive:fileX');
  });

  it('keys local-only rows by fingerprint when available', () => {
    expect(
      stanzaSongContentKey({
        id: 'row-1',
        title: 'Song',
        ytId: null,
        driveSourceFileId: undefined,
        localMediaFingerprint: '12345:180.00',
      }),
    ).toBe('localfp:12345:180.00');
  });

  it('keys local-only rows by blob size when fingerprint is missing', () => {
    expect(
      stanzaSongContentKey({
        id: 'row-1',
        ytId: null,
        driveSourceFileId: undefined,
        localAudioBlob: new Blob([new Uint8Array(100)]),
        title: 'Song.mp3',
      }),
    ).toBe('localfp:100:name:song.mp3');
  });

  it('prefers YouTube over Drive when both are present', () => {
    expect(
      stanzaSongContentKey({ id: 'a', title: 'Song', ytId: 'yt1', driveSourceFileId: 'driveZ' }),
    ).toBe('yt:yt1');
  });
});

describe('consolidateStanzaSongDuplicates', () => {
  it('keeps unique rows untouched and reports no remappings', () => {
    const rows = [
      song({ id: 'a', ytId: 'one', updatedAt: 10 }),
      song({ id: 'b', ytId: 'two', updatedAt: 20 }),
    ];
    const out = consolidateStanzaSongDuplicates(rows);
    expect(out.rows).toHaveLength(2);
    expect(out.remappedIds.size).toBe(0);
  });

  it('collapses two YouTube rows with the same ytId, newer updatedAt wins', () => {
    const rows = [
      song({ id: 'old', ytId: 'vid', updatedAt: 100, title: 'Old title' }),
      song({ id: 'new', ytId: 'vid', updatedAt: 200, title: 'New title' }),
    ];
    const out = consolidateStanzaSongDuplicates(rows);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0]?.id).toBe('new');
    expect(out.rows[0]?.title).toBe('New title');
    expect(out.remappedIds.get('old')).toBe('new');
  });

  it('breaks ties by lexicographically smaller id so two devices agree', () => {
    const rows = [
      song({ id: 'zzz', ytId: 'vid', updatedAt: 50 }),
      song({ id: 'aaa', ytId: 'vid', updatedAt: 50 }),
    ];
    const out = consolidateStanzaSongDuplicates(rows);
    expect(out.rows[0]?.id).toBe('aaa');
    expect(out.remappedIds.get('zzz')).toBe('aaa');
  });

  it('inherits local-only artefacts from the loser into the winner', () => {
    const blob = new Blob(['audio'], { type: 'audio/mpeg' });
    const thumb = new Blob(['jpeg'], { type: 'image/jpeg' });
    const rows = [
      song({ id: 'metaOnly', ytId: 'vid', updatedAt: 200 }),
      song({ id: 'hasBlob', ytId: 'vid', updatedAt: 100, localAudioBlob: blob, localVideoThumbnailBlob: thumb }),
    ];
    const out = consolidateStanzaSongDuplicates(rows);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0]?.id).toBe('metaOnly');
    expect(out.rows[0]?.localAudioBlob).toBe(blob);
    expect(out.rows[0]?.localVideoThumbnailBlob).toBe(thumb);
    expect(out.remappedIds.get('hasBlob')).toBe('metaOnly');
  });

  it('unions stem arrays by stem id, preserving local blobs', () => {
    const stemBlob = new Blob(['stem-audio'], { type: 'audio/mpeg' });
    const rows = [
      song({
        id: 'newer',
        ytId: 'vid',
        updatedAt: 200,
        stems: [{ id: 'stem-A', label: 'Vox', localBlob: undefined as unknown as Blob }],
      }),
      song({
        id: 'older',
        ytId: 'vid',
        updatedAt: 100,
        stems: [
          { id: 'stem-A', label: 'Vox', localBlob: stemBlob },
          { id: 'stem-B', label: 'Drums', localBlob: stemBlob },
        ],
      }),
    ];
    const out = consolidateStanzaSongDuplicates(rows);
    expect(out.rows[0]?.stems).toHaveLength(2);
    const stemA = out.rows[0]?.stems?.find((s) => s.id === 'stem-A');
    const stemB = out.rows[0]?.stems?.find((s) => s.id === 'stem-B');
    expect(stemA?.localBlob).toBe(stemBlob);
    expect(stemB?.localBlob).toBe(stemBlob);
  });

  it('keeps Drive-imported and YouTube versions of the same title separate', () => {
    const rows = [
      song({ id: 'a', ytId: 'vid', title: 'Blue', updatedAt: 10 }),
      song({ id: 'b', ytId: null, driveSourceFileId: undefined, title: 'Blue', updatedAt: 20 }),
    ];
    const out = consolidateStanzaSongDuplicates(rows);
    expect(out.rows).toHaveLength(2);
    expect(out.remappedIds.size).toBe(0);
  });

  it('inherits markers from the loser when the winner is newer but has no sections', () => {
    const rows = [
      song({
        id: 'local',
        driveSourceFileId: 'drive-file-1',
        updatedAt: 200,
        markers: [],
      }),
      song({
        id: 'remote',
        driveSourceFileId: 'drive-file-1',
        updatedAt: 100,
        markers: [{ time: 30, label: 'verse' }],
      }),
    ];
    const out = consolidateStanzaSongDuplicates(rows);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0]?.markers).toHaveLength(1);
    expect(out.rows[0]?.markers[0]?.label).toBe('verse');
  });

  it('preserves input order of each content key (no surprise grid shuffle)', () => {
    const rows = [
      song({ id: 'x', ytId: 'first', updatedAt: 1 }),
      song({ id: 'y', ytId: 'second', updatedAt: 1 }),
      song({ id: 'z', ytId: 'first', updatedAt: 2 }),
    ];
    const out = consolidateStanzaSongDuplicates(rows);
    expect(out.rows.map((r) => r.id)).toEqual(['z', 'y']);
  });
});
