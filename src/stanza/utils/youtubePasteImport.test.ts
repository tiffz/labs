import { describe, expect, it } from 'vitest';
import { canResolveYoutubePaste, resolveYoutubePaste, tryParseLooptubeImport } from './youtubePasteImport';

const LOOP =
  'https://looptube.io/?videoId=aUqXVQLJWSE&start=0&end=41.09375000000003&rate=1';

describe('youtubePasteImport', () => {
  it('parses LoopTube URL into video id, markers, seek, and rate', () => {
    const r = tryParseLooptubeImport(LOOP);
    expect(r).not.toBeNull();
    expect(r!.videoId).toBe('aUqXVQLJWSE');
    expect(r!.markers).toEqual([
      { time: 0, label: 'A' },
      { time: 41.09375000000003, label: 'B' },
    ]);
    expect(r!.seekSec).toBe(0);
    expect(r!.playbackRate).toBe(1);
  });

  it('still resolves normal YouTube URLs via resolveYoutubePaste', () => {
    expect(resolveYoutubePaste('https://www.youtube.com/watch?v=aUqXVQLJWSE')).toEqual({
      videoId: 'aUqXVQLJWSE',
      markers: [],
    });
  });

  it('canResolveYoutubePaste accepts LoopTube', () => {
    expect(canResolveYoutubePaste(LOOP)).toBe(true);
  });

  it('resolveYoutubePaste delegates to LoopTube parser', () => {
    const r = resolveYoutubePaste(LOOP);
    expect(r?.videoId).toBe('aUqXVQLJWSE');
    expect(r?.markers).toHaveLength(2);
  });

  it('rejects LoopTube without videoId', () => {
    expect(tryParseLooptubeImport('https://looptube.io/?start=1&end=2')).toBeNull();
  });
});
