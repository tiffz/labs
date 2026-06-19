import { describe, expect, it } from 'vitest';
import type { StanzaSong } from '../db/stanzaDb';
import { stanzaDriveSongNeedsMediaDownload } from './stanzaDriveMediaHydration';
import { stanzaMainMediaBytesFingerprint } from './stanzaDriveMainMediaSync';

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
});
