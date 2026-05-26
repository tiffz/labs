import { describe, expect, it } from 'vitest';
import { stanzaDriveSongNeedsMediaDownload } from './stanzaDriveMediaHydration';
import type { StanzaSong } from '../db/stanzaDb';

function row(partial: Partial<StanzaSong>): StanzaSong {
  return {
    id: 'a',
    ytId: null,
    title: 'Blue',
    markers: [],
    stats: {},
    updatedAt: 0,
    ...partial,
  };
}

describe('stanzaDriveSongNeedsMediaDownload', () => {
  it('is true for Drive-linked rows without a local blob', () => {
    expect(
      stanzaDriveSongNeedsMediaDownload(
        row({ driveSourceFileId: '11YoKjbXT8oNSFaP9C7n2HCmtISqPeX-7' }),
      ),
    ).toBe(true);
  });

  it('is false when blob is present', () => {
    expect(
      stanzaDriveSongNeedsMediaDownload(
        row({
          driveSourceFileId: 'file1',
          localAudioBlob: new Blob([1], { type: 'audio/mpeg' }),
        }),
      ),
    ).toBe(false);
  });

  it('is false for YouTube rows', () => {
    expect(stanzaDriveSongNeedsMediaDownload(row({ ytId: 'abc12345678' }))).toBe(false);
  });
});
