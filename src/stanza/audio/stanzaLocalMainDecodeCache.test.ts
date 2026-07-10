import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearStanzaLocalMainDecodeCache,
  getStanzaLocalMainDecodedBuffer,
} from './stanzaLocalMainDecodeCache';

const decodeCalls: string[] = [];

vi.mock('./decodeStanzaLocalBlob', () => ({
  decodeStanzaLocalBlobForPlayback: vi.fn(async (opts: { mediaUrl: string }) => {
    decodeCalls.push(opts.mediaUrl);
    return { duration: 12.5 } as AudioBuffer;
  }),
}));

describe('getStanzaLocalMainDecodedBuffer', () => {
  beforeEach(() => {
    decodeCalls.length = 0;
    clearStanzaLocalMainDecodeCache();
  });

  it('decodes once per media key and reuses the buffer', async () => {
    const blob = new Blob(['x'], { type: 'audio/wav' });
    const a = await getStanzaLocalMainDecodedBuffer({
      mediaKey: 'song:1',
      blob,
      mediaUrl: 'blob:a',
      title: 'T',
      isVideo: false,
    });
    const b = await getStanzaLocalMainDecodedBuffer({
      mediaKey: 'song:1',
      blob,
      mediaUrl: 'blob:a',
      title: 'T',
      isVideo: false,
    });
    expect(a.duration).toBe(12.5);
    expect(b).toBe(a);
    expect(decodeCalls).toHaveLength(1);
  });

  it('re-decodes when the media key changes', async () => {
    const blob = new Blob(['x'], { type: 'audio/wav' });
    await getStanzaLocalMainDecodedBuffer({
      mediaKey: 'song:1',
      blob,
      mediaUrl: 'blob:a',
      title: 'T',
      isVideo: false,
    });
    await getStanzaLocalMainDecodedBuffer({
      mediaKey: 'song:2',
      blob,
      mediaUrl: 'blob:b',
      title: 'T',
      isVideo: false,
    });
    expect(decodeCalls).toEqual(['blob:a', 'blob:b']);
  });
});
