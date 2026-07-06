import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAYBACK_SETTINGS } from '../../../rhythm/types';
import { DEFAULT_AUDIO_MIX, LabsAudioMixBus, mergeAudioMix } from './LabsAudioMixBus';
import {
  mixChannelsToPlaybackSettings,
  playbackSettingsToMixPatch,
} from './playbackSettingsMixSync';

describe('playbackSettingsMixSync', () => {
  it('round-trips metronome and accent volumes through the mix bus', () => {
    const settings: typeof DEFAULT_PLAYBACK_SETTINGS = {
      ...DEFAULT_PLAYBACK_SETTINGS,
      metronomeVolume: 80,
      measureAccentVolume: 88,
      beatGroupAccentVolume: 66,
      nonAccentVolume: 44,
    };
    const channels = mergeAudioMix(DEFAULT_AUDIO_MIX, playbackSettingsToMixPatch(settings));
    const bus = new LabsAudioMixBus({ ...channels, master: { volume: 100, muted: false } });
    const effective = bus.effectivePlaybackSettings(settings);
    expect(effective.metronomeVolume).toBe(80);
    expect(mixChannelsToPlaybackSettings(channels, DEFAULT_PLAYBACK_SETTINGS).metronomeVolume).toBe(
      80,
    );
  });

  it('updates effective metronome volume after patching from playback settings', () => {
    const bus = new LabsAudioMixBus({
      ...DEFAULT_AUDIO_MIX,
      metronome: { volume: 50, muted: false },
    });
    expect(bus.effectivePlaybackSettings(DEFAULT_PLAYBACK_SETTINGS).metronomeVolume).toBe(50);

    const nextSettings = { ...DEFAULT_PLAYBACK_SETTINGS, metronomeVolume: 25 };
    bus.setChannels(mergeAudioMix(bus.getChannels(), playbackSettingsToMixPatch(nextSettings)));
    expect(bus.effectivePlaybackSettings(nextSettings).metronomeVolume).toBe(25);
  });
});
