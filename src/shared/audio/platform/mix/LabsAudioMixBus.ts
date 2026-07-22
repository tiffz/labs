import type { PlaybackSettings } from '../../../rhythm/types';
import {
  buildEffectiveAuxiliaryDrumGain,
  buildEffectiveChannelGain,
  buildEffectiveDrumPlaybackSettings,
  type ChannelVolumeInput,
  type MasterDrumMixInput,
} from '../../../music/playbackVolumeMix';

export type AudioMixChannelState = {
  volume: number;
  muted: boolean;
};

export type AccentMixState = {
  measureAccentVolume: number;
  beatGroupAccentVolume: number;
  nonAccentVolume: number;
  accentMuted: boolean;
};

/** Normalized mix bus — apps map local storage into this shape. */
export type AudioMixChannels = {
  master: AudioMixChannelState;
  drums: AudioMixChannelState;
  metronome: AudioMixChannelState;
  backing?: AudioMixChannelState;
  accent?: AccentMixState;
  /** Underlying playback settings (reverb, emphasize simple rhythms). */
  playbackSettings?: PlaybackSettings;
};

/** Deep-partial patch for {@link mergeAudioMix} (volume-only updates preserve mute flags). */
export type AudioMixChannelsPatch = {
  master?: Partial<AudioMixChannelState>;
  drums?: Partial<AudioMixChannelState>;
  metronome?: Partial<AudioMixChannelState>;
  backing?: Partial<AudioMixChannelState>;
  accent?: Partial<AccentMixState>;
  playbackSettings?: PlaybackSettings;
};

export const DEFAULT_AUDIO_MIX: AudioMixChannels = {
  master: { volume: 100, muted: false },
  drums: { volume: 100, muted: false },
  metronome: { volume: 50, muted: false },
  backing: { volume: 70, muted: false },
  accent: {
    measureAccentVolume: 100,
    beatGroupAccentVolume: 80,
    nonAccentVolume: 60,
    accentMuted: false,
  },
};

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/** Unified mix calculations — wraps playbackVolumeMix for all apps. */
export class LabsAudioMixBus {
  private channels: AudioMixChannels;

  constructor(channels: AudioMixChannels) {
    this.channels = channels;
  }

  getChannels(): AudioMixChannels {
    return this.channels;
  }

  setChannels(next: AudioMixChannels): void {
    this.channels = next;
  }

  /** Words/Drums — effective PlaybackSettings after master × drums × accent. */
  effectivePlaybackSettings(base: PlaybackSettings): PlaybackSettings {
    const c = this.channels;
    const accent = c.accent;
    const input: MasterDrumMixInput = {
      playbackSettings: {
        ...base,
        measureAccentVolume: accent?.measureAccentVolume ?? base.measureAccentVolume,
        beatGroupAccentVolume: accent?.beatGroupAccentVolume ?? base.beatGroupAccentVolume,
        nonAccentVolume: accent?.nonAccentVolume ?? base.nonAccentVolume,
        metronomeVolume: c.metronome.volume,
      },
      drumsVolume: c.drums.volume,
      drumsMuted: c.drums.muted,
      accentMuted: accent?.accentMuted ?? false,
      metronomeMuted: c.metronome.muted,
      masterVolume: c.master.volume,
      masterMuted: c.master.muted,
    };
    return buildEffectiveDrumPlaybackSettings(input);
  }

  /** 0–1 gain for a named channel through master. */
  channelGain(channel: keyof Pick<AudioMixChannels, 'drums' | 'metronome' | 'backing'>): number {
    const ch = this.channels[channel];
    if (!ch) return 0;
    const input: ChannelVolumeInput = {
      channelVolume: ch.volume,
      channelMuted: ch.muted,
      masterVolume: this.channels.master.volume,
      masterMuted: this.channels.master.muted,
    };
    return buildEffectiveChannelGain(input);
  }

  /** Words backing beat auxiliary gain. */
  backingGain(): number {
    const backing = this.channels.backing;
    if (!backing) return 0;
    return buildEffectiveAuxiliaryDrumGain({
      channelVolume: backing.volume,
      channelMuted: backing.muted,
      masterVolume: this.channels.master.volume,
      masterMuted: this.channels.master.muted,
    });
  }

  /** Piano/Stanza linear 0–1 drum bus → mix channel. */
  static fromLinearDrumGain(gain0to1: number, muted: boolean): AudioMixChannelState {
    return { volume: clamp100(Math.round(gain0to1 * 100)), muted };
  }

  static linearDrumGain(channel: AudioMixChannelState): number {
    return channel.muted ? 0 : channel.volume / 100;
  }

  metronomeVolume0to100(): number {
    return this.channels.metronome.muted ? 0 : clamp100(this.channels.metronome.volume);
  }

  metronomeGain0to1(): number {
    return this.channelGain('metronome');
  }
}

export function mergeAudioMix(base: AudioMixChannels, patch: AudioMixChannelsPatch): AudioMixChannels {
  return {
    ...base,
    ...patch,
    master: { ...base.master, ...patch.master },
    drums: { ...base.drums, ...patch.drums },
    metronome: { ...base.metronome, ...patch.metronome },
    backing: patch.backing
      ? { ...(base.backing ?? DEFAULT_AUDIO_MIX.backing!), ...patch.backing }
      : base.backing,
    accent: patch.accent
      ? { ...(base.accent ?? DEFAULT_AUDIO_MIX.accent!), ...patch.accent }
      : base.accent,
  };
}
