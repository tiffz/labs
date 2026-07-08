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

  it('uses a coarser epsilon while playing to limit React paint churn', () => {
    const next = { ...base, currentTime: 10.15 };
    expect(mergeStanzaPlaybackSnapshot(base, next)).toBe(base);
    const jumped = { ...base, currentTime: 10.21 };
    expect(mergeStanzaPlaybackSnapshot(base, jumped)).toBe(jumped);
  });

  it('keeps a tight epsilon when paused for responsive scrub', () => {
    const paused = { ...base, isPlaying: false };
    const nudged = { ...paused, currentTime: 10.02 };
    expect(mergeStanzaPlaybackSnapshot(paused, nudged)).toBe(paused);
    const biggerNudge = { ...paused, currentTime: 10.05 };
    expect(mergeStanzaPlaybackSnapshot(paused, biggerNudge)).toBe(biggerNudge);
  });
});
