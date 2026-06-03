import { describe, expect, it, vi } from 'vitest';
import { applyStanzaYoutubeControllerMix } from './stanzaYoutubeMixVolume';

describe('applyStanzaYoutubeControllerMix', () => {
  it('sets volume 0 when muted', () => {
    const setVolume = vi.fn();
    applyStanzaYoutubeControllerMix({ setVolume } as never, { muted: true, linearGain: 0.8 });
    expect(setVolume).toHaveBeenCalledWith(0);
  });

  it('maps linear gain to YouTube 0–100 scale', () => {
    const setVolume = vi.fn();
    applyStanzaYoutubeControllerMix({ setVolume } as never, { muted: false, linearGain: 0.5 });
    expect(setVolume).toHaveBeenCalledWith(50);
  });
});
