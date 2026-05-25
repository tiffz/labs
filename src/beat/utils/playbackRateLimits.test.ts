import { describe, expect, it } from 'vitest';
import {
  BEAT_RATE_MIN,
  BEAT_SPEED_MENU_PRESETS,
  clampBeatPlaybackRate,
  snapYouTubePlaybackRate,
} from './playbackRateLimits';

describe('clampBeatPlaybackRate', () => {
  it('clamps and snaps to the rate grid', () => {
    expect(clampBeatPlaybackRate(0.12)).toBe(BEAT_RATE_MIN);
    expect(clampBeatPlaybackRate(0.87)).toBe(0.85);
    expect(clampBeatPlaybackRate(2.4)).toBe(2);
  });
});

describe('BEAT_SPEED_MENU_PRESETS', () => {
  it('includes sub-0.5× speeds and stays in range', () => {
    expect(BEAT_SPEED_MENU_PRESETS).toContain(0.25);
    expect(BEAT_SPEED_MENU_PRESETS[0]).toBe(0.25);
    for (const p of BEAT_SPEED_MENU_PRESETS) {
      expect(p).toBeGreaterThanOrEqual(BEAT_RATE_MIN);
      expect(p).toBeLessThanOrEqual(2);
    }
  });
});

describe('snapYouTubePlaybackRate', () => {
  it('snaps to a supported quarter-step rate', () => {
    expect(snapYouTubePlaybackRate(0.87)).toBe(0.75);
    expect(snapYouTubePlaybackRate(1.02)).toBe(1);
  });
});
