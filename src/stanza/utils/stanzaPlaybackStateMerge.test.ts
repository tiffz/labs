import { describe, expect, it } from 'vitest';
import { mergeStanzaPlaybackSnapshot } from './stanzaPlaybackStateMerge';

describe('mergeStanzaPlaybackSnapshot', () => {
  const base = {
    currentTime: 10,
    duration: 120,
    isPlaying: true,
    playbackRate: 1,
  };

  it('returns prev when transport delta is below epsilon', () => {
    const next = { ...base, currentTime: 10.02 };
    expect(mergeStanzaPlaybackSnapshot(base, next)).toBe(base);
  });

  it('returns next when play state changes', () => {
    const next = { ...base, isPlaying: false };
    expect(mergeStanzaPlaybackSnapshot(base, next)).toBe(next);
  });
});
