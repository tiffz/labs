import { describe, expect, it } from 'vitest';
import type { StanzaSong } from '../db/stanzaDb';
import { stanzaDriveSongNeedsMediaDownload } from './stanzaDriveMediaHydration';
import { mainMediaNeedsDriveUpload, stanzaMainMediaBytesFingerprint } from './stanzaDriveMainMediaSync';

describe('stanzaDriveMainMediaSync', () => {
  it('fingerprints blob size and type', () => {
    const b = new Blob(['abc'], { type: 'audio/mpeg' });
    expect(stanzaMainMediaBytesFingerprint(b)).toBe(`${b.size}:audio/mpeg`);
  });

  it('detects rows that need main media download', () => {
    const row: Pick<StanzaSong, 'ytId' | 'driveSourceFileId' | 'localAudioBlob'> = {
      ytId: null,
      driveSourceFileId: 'file-main',
      localAudioBlob: undefined,
    };
    expect(stanzaDriveSongNeedsMediaDownload(row)).toBe(true);
    expect(
      stanzaDriveSongNeedsMediaDownload({
        ...row,
        localAudioBlob: new Blob(['x'], { type: 'audio/mpeg' }),
      }),
    ).toBe(false);
  });

  it('uploads dual-source main blobs even when ytId is set', () => {
    const blob = new Blob(['upload'], { type: 'audio/mpeg' });
    const row = {
      id: 's1',
      ytId: 'ytVideoId12',
      title: 'Dual',
      markers: [],
      stats: {},
      updatedAt: 1,
      localAudioBlob: blob,
      practiceSource: 'local' as const,
    } satisfies StanzaSong;
    expect(mainMediaNeedsDriveUpload(row)).toBe(true);
    expect(
      mainMediaNeedsDriveUpload({
        ...row,
        driveSourceFileId: 'already',
        driveMainMediaBytesFingerprint: stanzaMainMediaBytesFingerprint(blob),
      }),
    ).toBe(false);
  });
});
