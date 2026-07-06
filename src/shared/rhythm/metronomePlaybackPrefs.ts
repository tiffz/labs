import type { MetronomePreferences } from '../audio/platform/metronome/preferences';
import type { RhythmMetronomePlaybackPrefs } from './rhythmPlayer';

/** Map platform metronome prefs to rhythm playback scheduler prefs. */
export function toRhythmMetronomePlaybackPrefs(
  metronomePreferences?: MetronomePreferences,
): RhythmMetronomePlaybackPrefs | undefined {
  if (!metronomePreferences) return undefined;
  return {
    subdivisionLevel: metronomePreferences.subdivisionLevel,
    sourceEnabled: metronomePreferences.sourceEnabled,
    subdivisionVolumes: metronomePreferences.subdivisionVolumes,
    levelChannelMutes: metronomePreferences.levelChannelMutes,
    channelClickMutes: metronomePreferences.channelClickMutes,
    channelVoiceMutes: metronomePreferences.channelVoiceMutes,
    channelDrumMutes: metronomePreferences.channelDrumMutes,
    clickGain: metronomePreferences.clickGain,
    voiceGain: metronomePreferences.voiceGain,
    drumGain: metronomePreferences.drumGain,
    voiceMode: metronomePreferences.voiceMode,
    masterVolume: metronomePreferences.masterVolume,
    masterMuted: metronomePreferences.masterMuted,
  };
}
