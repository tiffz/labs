import type { TimeSignature } from '../../../rhythm/types';
import type { MetronomeConfig } from '../../metronome/types';
import type { MetronomePreferences } from './preferences';
import { DEFAULT_METRONOME_DRUM_GAIN } from './preferences';

export function toMetronomeEngineConfig(
  prefs: MetronomePreferences,
  bpm: number,
  timeSignature: TimeSignature,
  extras: Partial<MetronomeConfig> = {},
): MetronomeConfig {
  const voiceGain = prefs.sourceEnabled.voice ? prefs.voiceGain : 0;
  const clickGain = prefs.sourceEnabled.click ? prefs.clickGain : 0;
  const drumGain = prefs.sourceEnabled.drum
    ? (prefs.drumGain > 0 ? prefs.drumGain : DEFAULT_METRONOME_DRUM_GAIN)
    : 0;
  const masterScale = prefs.masterMuted ? 0 : prefs.masterVolume / 100;

  return {
    bpm,
    timeSignature,
    volumes: prefs.subdivisionVolumes,
    mutedChannels: prefs.levelChannelMutes,
    voiceGain: voiceGain * masterScale,
    clickGain: clickGain * masterScale,
    drumGain: drumGain * masterScale,
    voiceMode: prefs.voiceMode,
    subdivisionLevel: prefs.subdivisionLevel,
    channelVoiceMutes: prefs.channelVoiceMutes,
    channelClickMutes: prefs.channelClickMutes,
    channelDrumMutes: prefs.channelDrumMutes,
    ...extras,
  };
}
