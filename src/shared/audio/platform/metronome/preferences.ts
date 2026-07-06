import type {
  SubdivisionChannel,
  SubdivisionLevel,
  SubdivisionVolumes,
  VoiceMode,
} from '../../metronome/types';
import type { TimeSignature } from '../../../rhythm/types';
import { getDefaultSubdivisionLevel } from '../../metronome/types';

/** Coarsest grid for playback apps — quarter pulses in /4, eighth in /8. */
export function getPlaybackAppDefaultSubdivisionLevel(ts: TimeSignature): SubdivisionLevel {
  if (ts.denominator === 8) return 2;
  return 1;
}

export const DEFAULT_SUBDIVISION_VOLUMES: SubdivisionVolumes = {
  accent: 1.0,
  quarter: 0.8,
  eighth: 0.0,
  sixteenth: 0.0,
};

export type MetronomeSourceEnabled = {
  voice: boolean;
  click: boolean;
  drum: boolean;
};

export type MetronomePreferences = {
  subdivisionLevel: SubdivisionLevel;
  voiceMode: VoiceMode;
  subdivisionVolumes: SubdivisionVolumes;
  voiceGain: number;
  clickGain: number;
  drumGain: number;
  masterVolume: number;
  /** UI mute for overall level — preserves masterVolume slider value. */
  masterMuted: boolean;
  /** UI mute per subdivision level — preserves subdivisionVolumes. */
  levelChannelMutes: SubdivisionChannel[];
  sourceEnabled: MetronomeSourceEnabled;
  channelVoiceMutes: SubdivisionChannel[];
  channelClickMutes: SubdivisionChannel[];
  channelDrumMutes: SubdivisionChannel[];
};

export type MetronomeAppDefaults = Partial<MetronomePreferences> & {
  timeSignature?: TimeSignature;
};

export const DEFAULT_METRONOME_DRUM_GAIN = 0.7;

export function defaultMetronomePreferences(
  ts: TimeSignature = { numerator: 4, denominator: 4 },
  overrides: Partial<MetronomePreferences> = {},
): MetronomePreferences {
  return {
    subdivisionLevel: getDefaultSubdivisionLevel(ts),
    voiceMode: 'counting',
    subdivisionVolumes: { ...DEFAULT_SUBDIVISION_VOLUMES },
    voiceGain: 0,
    clickGain: 0.5,
    drumGain: 0,
    masterVolume: 50,
    masterMuted: false,
    levelChannelMutes: [],
    sourceEnabled: { voice: false, click: true, drum: false },
    channelVoiceMutes: [],
    channelClickMutes: [],
    channelDrumMutes: [],
    ...overrides,
  };
}

export const PLAYBACK_APP_METRONOME_DEFAULTS: Partial<MetronomePreferences> = {
  voiceGain: 0.85,
  clickGain: 0.5,
  drumGain: 0,
  sourceEnabled: { voice: false, click: true, drum: false },
  masterVolume: 50,
  masterMuted: false,
  levelChannelMutes: [],
  subdivisionVolumes: {
    accent: 1.0,
    quarter: 0.8,
    eighth: 0.7,
    sixteenth: 0.55,
  },
};

/** Default level sliders for the “Reset levels” control in advanced settings. */
export function defaultMetronomeLevelVolumes(
  overrides: Partial<MetronomePreferences> = {},
): Pick<MetronomePreferences, 'subdivisionVolumes' | 'masterVolume' | 'levelChannelMutes' | 'masterMuted'> {
  const baseline = defaultMetronomePreferences(undefined, {
    ...PLAYBACK_APP_METRONOME_DEFAULTS,
    ...overrides,
  });
  return {
    subdivisionVolumes: { ...baseline.subdivisionVolumes },
    masterVolume: baseline.masterVolume,
    levelChannelMutes: [],
    masterMuted: false,
  };
}

export const COUNT_METRONOME_DEFAULTS: Partial<MetronomePreferences> = {
  voiceGain: 1,
  clickGain: 0.5,
  drumGain: 0,
  sourceEnabled: { voice: true, click: true, drum: false },
};

export function isMetronomeNonDefault(
  prefs: MetronomePreferences,
  baseline: MetronomePreferences,
): boolean {
  return JSON.stringify(prefs) !== JSON.stringify(baseline);
}

export function encodeMetronomePreferences(prefs: MetronomePreferences): string {
  return JSON.stringify(prefs);
}

export function decodeMetronomePreferences(
  raw: string,
  fallback?: MetronomePreferences,
): MetronomePreferences | null {
  try {
    const parsed = JSON.parse(raw) as Partial<MetronomePreferences>;
    if (!fallback) return parsed as MetronomePreferences;
    return normalizeMetronomePreferences(parsed, fallback);
  } catch {
    return null;
  }
}

export function normalizeMetronomePreferences(
  partial: Partial<MetronomePreferences>,
  fallback: MetronomePreferences,
): MetronomePreferences {
  return {
    ...fallback,
    ...partial,
    subdivisionVolumes: {
      ...fallback.subdivisionVolumes,
      ...partial.subdivisionVolumes,
    },
    sourceEnabled: {
      ...fallback.sourceEnabled,
      ...partial.sourceEnabled,
    },
    levelChannelMutes: partial.levelChannelMutes ?? fallback.levelChannelMutes,
    masterMuted: partial.masterMuted ?? fallback.masterMuted,
    channelVoiceMutes: partial.channelVoiceMutes ?? fallback.channelVoiceMutes,
    channelClickMutes: partial.channelClickMutes ?? fallback.channelClickMutes,
    channelDrumMutes: partial.channelDrumMutes ?? fallback.channelDrumMutes,
  };
}
