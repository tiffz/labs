import { describe, expect, it } from 'vitest';
import {
  buildEffectiveAuxiliaryDrumGain,
  buildEffectiveChannelGain,
  buildEffectiveDrumPlaybackSettings,
} from './playbackVolumeMix';

describe('playbackVolumeMix', () => {
  it('buildEffectiveDrumPlaybackSettings scales drum volumes', () => {
    const settings = buildEffectiveDrumPlaybackSettings({
      playbackSettings: {
        nonAccentVolume: 100,
        beatGroupAccentVolume: 100,
        measureAccentVolume: 100,
        metronomeVolume: 100,
        emphasizeSimpleRhythms: false,
        reverbStrength: 0,
        autoScrollDuringPlayback: true,
      },
      drumsVolume: 50,
      drumsMuted: false,
      accentMuted: false,
      metronomeMuted: false,
      masterVolume: 100,
      masterMuted: false,
    });
    expect(settings.nonAccentVolume).toBe(50);
  });

  it('buildEffectiveChannelGain returns zero when master muted', () => {
    expect(
      buildEffectiveChannelGain({
        channelVolume: 100,
        channelMuted: false,
        masterVolume: 100,
        masterMuted: true,
      })
    ).toBe(0);
  });

  it('buildEffectiveAuxiliaryDrumGain scales channel through master', () => {
    expect(
      buildEffectiveAuxiliaryDrumGain({
        channelVolume: 50,
        channelMuted: false,
        masterVolume: 80,
        masterMuted: false,
      })
    ).toBeCloseTo(0.4);
  });

  it('buildEffectiveDrumPlaybackSettings mutes metronome independently', () => {
    const settings = buildEffectiveDrumPlaybackSettings({
      playbackSettings: {
        nonAccentVolume: 100,
        beatGroupAccentVolume: 100,
        measureAccentVolume: 100,
        metronomeVolume: 100,
        emphasizeSimpleRhythms: false,
        reverbStrength: 0,
        autoScrollDuringPlayback: true,
      },
      drumsVolume: 100,
      drumsMuted: false,
      accentMuted: false,
      metronomeMuted: true,
      masterVolume: 100,
      masterMuted: false,
    });
    expect(settings.metronomeVolume).toBe(0);
    expect(settings.nonAccentVolume).toBe(100);
  });
});
