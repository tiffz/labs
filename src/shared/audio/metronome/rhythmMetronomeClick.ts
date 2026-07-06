import { clickVolumeForSubdivision } from './subdivisionClickSchedule';
import type { SubdivisionChannel, SubdivisionType, SubdivisionVolumes, VoiceMode } from './types';
import type { MetronomeVisualDot } from './metronomeVisualDots';
import type { MetronomeDrumSound } from './metronomeDrumSamples';
import { DEFAULT_METRONOME_DRUM_GAIN } from '../platform/metronome/preferences';

export const METRONOME_DRUM_FOR_SUBDIVISION: Record<SubdivisionType, MetronomeDrumSound> = {
  accent: 'dum',
  quarter: 'dum',
  eighth: 'tak',
  sixteenth: 'ka',
};

export type RhythmMetronomeClickPrefs = {
  sourceEnabled: { click: boolean; voice: boolean; drum: boolean };
  subdivisionVolumes: SubdivisionVolumes;
  levelChannelMutes: SubdivisionChannel[];
  channelClickMutes: SubdivisionChannel[];
  channelVoiceMutes: SubdivisionChannel[];
  channelDrumMutes: SubdivisionChannel[];
  clickGain: number;
  voiceGain: number;
  drumGain: number;
  voiceMode: VoiceMode;
  masterVolume: number;
  masterMuted: boolean;
};

export type ResolvedRhythmMetronomeClick = {
  volume: number;
  playbackRate: number;
};

/**
 * Resolve whether a grid dot should audibly click during rhythm playback and at what gain.
 * Mirrors MetronomeEngine channel gating (volumes, mutes, click source).
 */
export function resolveRhythmMetronomeClick(
  dot: MetronomeVisualDot,
  prefs: RhythmMetronomeClickPrefs,
  legacyMetronomeVolume0to100: number,
): ResolvedRhythmMetronomeClick | null {
  if (dot.silent) return null;
  if (!prefs.sourceEnabled.click) return null;
  if (prefs.levelChannelMutes.includes(dot.subdivision)) return null;
  if (prefs.channelClickMutes.includes(dot.subdivision)) return null;

  const channelGain = prefs.subdivisionVolumes[dot.subdivision] ?? 0;
  if (channelGain <= 0) return null;

  const masterScale = prefs.masterMuted ? 0 : (prefs.masterVolume / 100) * (legacyMetronomeVolume0to100 / 100);
  if (masterScale <= 0) return null;

  const { volume: tierVolume, playbackRate } = clickVolumeForSubdivision(
    dot.subdivision,
    channelGain,
  );
  const volume = tierVolume * prefs.clickGain * masterScale;
  if (volume <= 0) return null;

  return { volume: Math.min(1, volume), playbackRate };
}

export type ResolvedRhythmMetronomeVoice = {
  sampleId: string;
  volume: number;
};

/** Resolve vocal count sample for a rhythm-playback metronome dot. */
export function resolveRhythmMetronomeVoice(
  dot: MetronomeVisualDot,
  prefs: RhythmMetronomeClickPrefs,
  legacyMetronomeVolume0to100: number,
  subdivDurationSec: number,
  voiceSubdivMinDurSec: number,
): ResolvedRhythmMetronomeVoice | null {
  if (!dot.sampleId) return null;
  if (dot.silent) return null;
  if (!prefs.sourceEnabled.voice) return null;
  if (prefs.voiceGain <= 0) return null;
  if (prefs.levelChannelMutes.includes(dot.subdivision)) return null;
  if (prefs.channelVoiceMutes.includes(dot.subdivision)) return null;

  const channelGain = prefs.subdivisionVolumes[dot.subdivision] ?? 0;
  if (channelGain <= 0) return null;

  const isBeatVoice = dot.subdivision === 'accent' || dot.subdivision === 'quarter';
  if (!isBeatVoice && subdivDurationSec < voiceSubdivMinDurSec) return null;

  const masterScale = prefs.masterMuted
    ? 0
    : (prefs.masterVolume / 100) * (legacyMetronomeVolume0to100 / 100);
  if (masterScale <= 0) return null;

  const volume = channelGain * prefs.voiceGain * masterScale;
  if (volume <= 0) return null;

  return { sampleId: dot.sampleId, volume: Math.min(1, volume) };
}

export type ResolvedRhythmMetronomeDrum = {
  sound: MetronomeDrumSound;
  volume: number;
};

/** Resolve darbuka drum sample (dum/tak/ka) for a rhythm-playback metronome dot. */
export function resolveRhythmMetronomeDrum(
  dot: MetronomeVisualDot,
  prefs: RhythmMetronomeClickPrefs,
  legacyMetronomeVolume0to100: number,
): ResolvedRhythmMetronomeDrum | null {
  if (dot.silent) return null;
  if (!prefs.sourceEnabled.drum) return null;

  const drumGain = prefs.drumGain > 0 ? prefs.drumGain : DEFAULT_METRONOME_DRUM_GAIN;
  if (drumGain <= 0) return null;
  if (prefs.levelChannelMutes.includes(dot.subdivision)) return null;
  if (prefs.channelDrumMutes.includes(dot.subdivision)) return null;

  const channelGain = prefs.subdivisionVolumes[dot.subdivision] ?? 0;
  if (channelGain <= 0) return null;

  const masterScale = prefs.masterMuted
    ? 0
    : (prefs.masterVolume / 100) * (legacyMetronomeVolume0to100 / 100);
  if (masterScale <= 0) return null;

  const volume = channelGain * drumGain * masterScale;
  if (volume <= 0) return null;

  return {
    sound: METRONOME_DRUM_FOR_SUBDIVISION[dot.subdivision],
    volume: Math.min(1, volume),
  };
}

/** Suggested channel gains when a user enables finer subdivisions (off-beat sliders were at 0). */
export const ENABLED_SUBDIVISION_CHANNEL_GAINS: Partial<
  Record<SubdivisionType, number>
> = {
  eighth: 0.7,
  sixteenth: 0.55,
};

export function channelsNeededForSubdivisionLevel(
  level: 1 | 2 | 3 | 4 | 'swing8',
): SubdivisionType[] {
  if (level === 1) return [];
  if (level === 4) return ['eighth', 'sixteenth'];
  return ['eighth'];
}

export function subdivisionVolumesForLevel(
  level: 1 | 2 | 3 | 4 | 'swing8',
  current: SubdivisionVolumes,
): SubdivisionVolumes {
  const next = { ...current };
  for (const ch of channelsNeededForSubdivisionLevel(level)) {
    if ((next[ch] ?? 0) <= 0) {
      next[ch] = ENABLED_SUBDIVISION_CHANNEL_GAINS[ch] ?? next[ch];
    }
  }
  return next;
}
