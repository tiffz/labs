import type { LevelConfig, SightProfile } from './types';

export const CURRICULUM_SCHEMA_VERSION = 7;

/**
 * Seven-phase curriculum (30 levels):
 * 1–7 isolated, 8–11 Albers relational, 12–20 calibration, 21–22 gamut,
 * 23–24 harmony wheel, 25–26 subtractive equalizer, 27–28 Munsell slice, 29–30 atmospheric cast.
 */
export const LEVEL_TABLE: LevelConfig[] = [
  {
    level: 1,
    module: 'flashcard',
    phase: 'isolated',
    label: 'Value · grayscale',
    flashcardKind: 'isolated',
    isolatedProfile: 'valueGrayscale',
  },
  {
    level: 2,
    module: 'flashcard',
    phase: 'isolated',
    label: 'Value · hue contrast',
    flashcardKind: 'isolated',
    isolatedProfile: 'valueHueContrast',
  },
  {
    level: 3,
    module: 'flashcard',
    phase: 'isolated',
    label: 'Value · near match',
    flashcardKind: 'isolated',
    isolatedProfile: 'valueNearMatch',
  },
  {
    level: 4,
    module: 'flashcard',
    phase: 'isolated',
    label: 'Chroma · easy',
    flashcardKind: 'isolated',
    isolatedProfile: 'chromaEasy',
  },
  {
    level: 5,
    module: 'flashcard',
    phase: 'isolated',
    label: 'Chroma · tricky',
    flashcardKind: 'isolated',
    isolatedProfile: 'chromaHard',
  },
  {
    level: 6,
    module: 'flashcard',
    phase: 'isolated',
    label: 'Temperature undertones',
    flashcardKind: 'isolated',
    isolatedProfile: 'temperatureUndertone',
  },
  {
    level: 7,
    module: 'flashcard',
    phase: 'isolated',
    label: 'Temperature · hue boundary',
    flashcardKind: 'isolated',
    isolatedProfile: 'temperatureHueBoundary',
  },
  {
    level: 8,
    module: 'flashcard',
    phase: 'relational',
    label: 'Same or different?',
    flashcardKind: 'albers',
    albersProfile: 'identity',
  },
  {
    level: 9,
    module: 'flashcard',
    phase: 'relational',
    label: 'Perceived value',
    flashcardKind: 'albers',
    albersProfile: 'perceivedValue',
  },
  {
    level: 10,
    module: 'flashcard',
    phase: 'relational',
    label: 'Perceived temperature',
    flashcardKind: 'albers',
    albersProfile: 'perceivedTemperature',
  },
  {
    level: 11,
    module: 'flashcard',
    phase: 'relational',
    label: 'Perceived chroma',
    flashcardKind: 'albers',
    albersProfile: 'perceivedChroma',
  },
  {
    level: 12,
    module: 'contextual',
    phase: 'calibration',
    label: 'Match side by side',
    contextualProfile: 'adjacentFlat',
    maxDeltaE: 6.0,
  },
  {
    level: 13,
    module: 'contextual',
    phase: 'calibration',
    label: 'Match on gray',
    contextualProfile: 'flatNeutral',
    maxDeltaE: 5.0,
  },
  {
    level: 14,
    module: 'contextual',
    phase: 'calibration',
    label: 'Value in context',
    contextualProfile: 'valueLocked',
    maxDeltaE: 5.0,
  },
  {
    level: 15,
    module: 'contextual',
    phase: 'calibration',
    label: 'Saturation in context',
    contextualProfile: 'chromaLocked',
    maxDeltaE: 4.5,
  },
  {
    level: 16,
    module: 'contextual',
    phase: 'calibration',
    label: 'Value + saturation',
    contextualProfile: 'hueLocked',
    maxDeltaE: 4.0,
  },
  {
    level: 17,
    module: 'contextual',
    phase: 'calibration',
    label: 'Hue in context',
    contextualProfile: 'lightnessChromaLocked',
    maxDeltaE: 3.75,
  },
  {
    level: 18,
    module: 'contextual',
    phase: 'calibration',
    label: 'Full match',
    contextualProfile: 'full',
    maxDeltaE: 3.5,
  },
  {
    level: 19,
    module: 'bridge',
    phase: 'calibration',
    label: 'Single-axis bridge',
    bridgeProfile: 'singleAxis',
    maxBridgeVariancePct: 6,
  },
  {
    level: 20,
    module: 'bridge',
    phase: 'calibration',
    label: 'Warm–cool bridge',
    bridgeProfile: 'warmCool',
    maxBridgeVariancePct: 4,
  },
  {
    level: 21,
    module: 'gamut',
    phase: 'harmony',
    label: 'Wide gamut mask',
    gamutProfile: 'wide',
    minGamutOverlapPct: 72,
  },
  {
    level: 22,
    module: 'gamut',
    phase: 'harmony',
    label: 'Compressed gamut',
    gamutProfile: 'compressed',
    minGamutOverlapPct: 78,
  },
  {
    level: 23,
    module: 'anchor-pivot',
    phase: 'harmony',
    label: 'Complementary pivot',
  },
  {
    level: 24,
    module: 'anchor-pivot',
    phase: 'harmony',
    label: 'Split & triadic pivot',
  },
  {
    level: 25,
    module: 'albers-equalizer',
    phase: 'subtractive',
    label: 'Warm–cool equalizer',
    maxDeltaE: 4,
  },
  {
    level: 26,
    module: 'albers-equalizer',
    phase: 'subtractive',
    label: 'Saturation equalizer',
    maxDeltaE: 3.5,
  },
  {
    level: 27,
    module: 'munsell-slice',
    phase: 'dimensional',
    label: 'Value slice outlier',
  },
  {
    level: 28,
    module: 'munsell-slice',
    phase: 'dimensional',
    label: 'Chroma slice outlier',
  },
  {
    level: 29,
    module: 'yot-cast',
    phase: 'atmospheric',
    label: 'Light cast · scenes',
  },
  {
    level: 30,
    module: 'yot-cast',
    phase: 'atmospheric',
    label: 'Light cast · tricky',
  },
];

export const MAX_LEVEL = LEVEL_TABLE.length;

export function getLevelConfig(level: number): LevelConfig {
  const clamped = Math.max(1, Math.min(LEVEL_TABLE.length, Math.floor(level)));
  return LEVEL_TABLE[clamped - 1]!;
}

export function profilePeakLevel(profile: Pick<SightProfile, 'level' | 'peakLevel'>): number {
  const peak = Math.floor(profile.peakLevel ?? profile.level);
  return Math.max(profile.level, Math.max(1, Math.min(LEVEL_TABLE.length, peak)));
}

/** @deprecated Prefer `profilePeakLevel(profile)` — number-only callers treat level as peak. */
export function maxUnlockedLevel(profileLevel: number): number {
  return Math.max(1, Math.min(LEVEL_TABLE.length, Math.floor(profileLevel)));
}
