import { describe, expect, it } from 'vitest';
import type { StanzaStemTrack } from '../db/stanzaDb';
import { stanzaSongStemsNeedHydration, stanzaStemBytesFingerprint } from './stanzaDriveStemSync';

describe('stanzaDriveStemSync', () => {
  it('detects stems that need hydration', () => {
    const stems: StanzaStemTrack[] = [
      {
        id: 'a',
        label: 'L',
        localBlob: new Blob([], { type: 'audio/wav' }),
        driveFileId: 'file-1',
      },
    ];
    expect(stanzaSongStemsNeedHydration({ stems })).toBe(true);
    expect(
      stanzaSongStemsNeedHydration({
        stems: [{ id: 'a', label: 'L', localBlob: new Blob(['x'], { type: 'audio/wav' }), driveFileId: 'f' }],
      }),
    ).toBe(false);
  });

  it('fingerprints blob size and type', () => {
    const b = new Blob(['abc'], { type: 'audio/wav' });
    expect(stanzaStemBytesFingerprint(b)).toBe(`${b.size}:audio/wav`);
  });
});
