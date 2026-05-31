import type { PlaybackSettings } from '../rhythm/types';

export type MasterDrumMixInput = {
  playbackSettings: PlaybackSettings;
  drumsVolume: number;
  drumsMuted: boolean;
  accentMuted: boolean;
  metronomeMuted: boolean;
  masterVolume: number;
  masterMuted: boolean;
};

export type ChannelVolumeInput = {
  channelVolume: number;
  channelMuted: boolean;
  masterVolume: number;
  masterMuted: boolean;
};

function masterScale(masterVolume: number, masterMuted: boolean): number {
  return masterMuted ? 0 : Math.max(0, Math.min(100, masterVolume)) / 100;
}

/** Scale drum playback settings by master + drums mixer channels. */
export function buildEffectiveDrumPlaybackSettings(
  input: MasterDrumMixInput
): PlaybackSettings {
  const {
    playbackSettings,
    drumsVolume,
    drumsMuted,
    accentMuted,
    metronomeMuted,
    masterVolume,
    masterMuted,
  } = input;
  const scale = masterScale(masterVolume, masterMuted);
  const drumsChannelScale =
    (drumsMuted ? 0 : Math.max(0, Math.min(100, drumsVolume)) / 100) * scale;
  const accentScale = accentMuted ? 0 : 1;
  const metronomeChannelScale = metronomeMuted ? 0 : scale;
  return {
    ...playbackSettings,
    nonAccentVolume: Math.round(playbackSettings.nonAccentVolume * drumsChannelScale),
    beatGroupAccentVolume: Math.round(
      playbackSettings.beatGroupAccentVolume * drumsChannelScale * accentScale
    ),
    measureAccentVolume: Math.round(
      playbackSettings.measureAccentVolume * drumsChannelScale * accentScale
    ),
    metronomeVolume: Math.round(playbackSettings.metronomeVolume * metronomeChannelScale),
  };
}

/** Scale a 0–100 channel through master mute/volume to a 0–1 gain. */
export function buildEffectiveChannelGain(input: ChannelVolumeInput): number {
  const { channelVolume, channelMuted, masterVolume, masterMuted } = input;
  const scale = masterScale(masterVolume, masterMuted);
  const channelScale = channelMuted
    ? 0
    : Math.max(0, Math.min(100, channelVolume)) / 100;
  return Math.max(0, Math.min(1, channelScale * scale));
}

/** Backing beat / auxiliary drum hits: same master × channel scaling as chord gain. */
export function buildEffectiveAuxiliaryDrumGain(input: ChannelVolumeInput): number {
  return buildEffectiveChannelGain(input);
}
