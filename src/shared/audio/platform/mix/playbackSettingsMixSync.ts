import type { PlaybackSettings } from '../../../rhythm/types';
import type { AudioMixChannels, AudioMixChannelsPatch } from './LabsAudioMixBus';

/** Map playback-settings sliders into mix-bus channel volumes (preserves mute flags via merge). */
export function playbackSettingsToMixPatch(
  settings: PlaybackSettings,
): Pick<AudioMixChannelsPatch, 'metronome' | 'accent'> {
  return {
    metronome: { volume: settings.metronomeVolume },
    accent: {
      measureAccentVolume: settings.measureAccentVolume,
      beatGroupAccentVolume: settings.beatGroupAccentVolume,
      nonAccentVolume: settings.nonAccentVolume,
    },
  };
}

/** Hydrate playback-settings UI from persisted mix-bus channels. */
export function mixChannelsToPlaybackSettings(
  channels: AudioMixChannels,
  base: PlaybackSettings,
): PlaybackSettings {
  const accent = channels.accent;
  return {
    ...base,
    measureAccentVolume: accent?.measureAccentVolume ?? base.measureAccentVolume,
    beatGroupAccentVolume: accent?.beatGroupAccentVolume ?? base.beatGroupAccentVolume,
    nonAccentVolume: accent?.nonAccentVolume ?? base.nonAccentVolume,
    metronomeVolume: channels.metronome.volume,
  };
}
