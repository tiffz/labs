import { describe, expect, it } from 'vitest';
import { mergeStanzaPlaybackSnapshot } from '../utils/stanzaPlaybackStateMerge';

/**
 * Simulates LabsYouTubePlayer poll ticks feeding StanzaWorkspace playback state
 * without mounting a live YouTube iframe.
 */
describe('stanza YouTube transport paint (no iframe)', () => {
  const playing = {
    currentTime: 0,
    duration: 300,
    isPlaying: true,
    playbackRate: 1,
  };

  it('coalesces rapid poll ticks to ~5 paint updates per second while playing', () => {
    let paintUpdates = 0;
    let state = playing;

    const applyPollTick = (currentTime: number) => {
      const next = mergeStanzaPlaybackSnapshot(state, { ...playing, currentTime });
      if (next !== state) {
        paintUpdates += 1;
        state = next;
      }
    };

    for (let t = 0; t <= 1; t += 0.05) {
      applyPollTick(Number(t.toFixed(2)));
    }

    expect(paintUpdates).toBeLessThanOrEqual(6);
    expect(state.currentTime).toBeGreaterThanOrEqual(0.8);
  });

  it('applies poll ticks immediately when paused for responsive scrub', () => {
    let state = { ...playing, isPlaying: false, currentTime: 10 };
    let paintUpdates = 0;

    const applyPollTick = (currentTime: number) => {
      const next = mergeStanzaPlaybackSnapshot(state, {
        ...state,
        currentTime,
        isPlaying: false,
      });
      if (next !== state) {
        paintUpdates += 1;
        state = next;
      }
    };

    applyPollTick(10.02);
    applyPollTick(10.05);

    expect(paintUpdates).toBe(1);
    expect(state.currentTime).toBe(10.05);
  });
});
