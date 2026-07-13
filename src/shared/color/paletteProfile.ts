import type { HarmonySystem } from './types';

export type PaletteMoodPreset =
  | 'mixed'
  | 'vivid'
  | 'pastel'
  | 'neon'
  | 'neonInk'
  | 'contrast'
  | 'jewel'
  | 'earth'
  | 'muted'
  | 'custom';

/** Moods sampled when the Mixed preset is active (one per random gallery row). */
export const PALETTE_MIXED_MOOD_POOL: Array<Exclude<PaletteMoodPreset, 'custom' | 'mixed'>> = [
  'vivid',
  'pastel',
  'neon',
  'neonInk',
  'contrast',
  'jewel',
  'earth',
  'muted',
];

/** How aggressively to clip generated colors to sRGB display gamut. */
export type PaletteGamutMode = 'srgb' | 'wide';

export interface PaletteGenerationProfile {
  id: PaletteMoodPreset;
  label: string;
  lightnessMin: number;
  lightnessMax: number;
  chromaMin: number;
  chromaMax: number;
  /** Optional hue window (degrees). Omit for full wheel. */
  hueMin?: number;
  hueMax?: number;
  gamut: PaletteGamutMode;
}

export const PALETTE_MOOD_PRESETS: Record<Exclude<PaletteMoodPreset, 'custom'>, PaletteGenerationProfile> = {
  mixed: {
    id: 'mixed',
    label: 'Mixed',
    lightnessMin: 0.2,
    lightnessMax: 0.85,
    chromaMin: 0.04,
    chromaMax: 0.3,
    gamut: 'srgb',
  },
  vivid: {
    id: 'vivid',
    label: 'Vivid',
    lightnessMin: 0.36,
    lightnessMax: 0.78,
    chromaMin: 0.14,
    chromaMax: 0.3,
    gamut: 'srgb',
  },
  pastel: {
    id: 'pastel',
    label: 'Pastel',
    lightnessMin: 0.78,
    lightnessMax: 0.93,
    chromaMin: 0.04,
    chromaMax: 0.11,
    gamut: 'srgb',
  },
  neon: {
    id: 'neon',
    label: 'Neon',
    lightnessMin: 0.58,
    lightnessMax: 0.74,
    chromaMin: 0.22,
    chromaMax: 0.36,
    gamut: 'wide',
  },
  neonInk: {
    id: 'neonInk',
    label: 'Neon + ink',
    lightnessMin: 0.04,
    lightnessMax: 0.98,
    chromaMin: 0,
    chromaMax: 0.38,
    gamut: 'wide',
  },
  contrast: {
    id: 'contrast',
    label: 'High contrast',
    lightnessMin: 0.06,
    lightnessMax: 0.96,
    chromaMin: 0,
    chromaMax: 0.24,
    gamut: 'srgb',
  },
  jewel: {
    id: 'jewel',
    label: 'Jewel tones',
    lightnessMin: 0.3,
    lightnessMax: 0.52,
    chromaMin: 0.14,
    chromaMax: 0.3,
    gamut: 'srgb',
  },
  earth: {
    id: 'earth',
    label: 'Earth tones',
    lightnessMin: 0.32,
    lightnessMax: 0.68,
    chromaMin: 0.04,
    chromaMax: 0.14,
    hueMin: 28,
    hueMax: 95,
    gamut: 'srgb',
  },
  muted: {
    id: 'muted',
    label: 'Muted',
    lightnessMin: 0.42,
    lightnessMax: 0.7,
    chromaMin: 0.03,
    chromaMax: 0.1,
    gamut: 'srgb',
  },
};

export const DEFAULT_PALETTE_PROFILE = PALETTE_MOOD_PRESETS.mixed;

export type PaletteRandomTemplate =
  | 'balanced'
  | 'complementary'
  | 'triadic'
  | 'analogous'
  | 'splitComplementary'
  | 'tetradic'
  | 'monochrome';

export const PALETTE_RANDOM_TEMPLATES: Array<{ id: PaletteRandomTemplate; label: string; harmony: HarmonySystem | 'monochrome' }> =
  [
    { id: 'balanced', label: 'Balanced mix', harmony: 'analogous' },
    { id: 'complementary', label: 'Complementary', harmony: 'complementary' },
    { id: 'triadic', label: 'Triadic', harmony: 'triadic' },
    { id: 'analogous', label: 'Analogous', harmony: 'analogous' },
    { id: 'splitComplementary', label: 'Split complementary', harmony: 'splitComplementary' },
    { id: 'tetradic', label: 'Tetradic', harmony: 'tetradic' },
    { id: 'monochrome', label: 'Monochrome', harmony: 'monochrome' },
  ];

export function resolvePaletteProfile(
  preset: PaletteMoodPreset,
  overrides?: Partial<Pick<PaletteGenerationProfile, 'lightnessMin' | 'lightnessMax' | 'chromaMin' | 'chromaMax' | 'gamut'>>,
): PaletteGenerationProfile {
  const base =
    preset === 'custom'
      ? { ...DEFAULT_PALETTE_PROFILE, id: 'custom' as const, label: 'Custom' }
      : { ...PALETTE_MOOD_PRESETS[preset] };
  return { ...base, ...overrides };
}

export function pickMixedMoodProfile(rand: () => number): PaletteGenerationProfile {
  const index = Math.floor(rand() * PALETTE_MIXED_MOOD_POOL.length);
  const mood = PALETTE_MIXED_MOOD_POOL[index] ?? 'vivid';
  return { ...PALETTE_MOOD_PRESETS[mood] };
}

export function hueWithinProfile(h: number, profile: PaletteGenerationProfile): boolean {
  if (profile.hueMin == null || profile.hueMax == null) return true;
  const hue = ((h % 360) + 360) % 360;
  if (profile.hueMin <= profile.hueMax) {
    return hue >= profile.hueMin && hue <= profile.hueMax;
  }
  return hue >= profile.hueMin || hue <= profile.hueMax;
}

export function clampToProfile(state: { h: number; c: number; l: number }, profile: PaletteGenerationProfile): {
  h: number;
  c: number;
  l: number;
} {
  let h = state.h;
  if (!hueWithinProfile(h, profile) && profile.hueMin != null && profile.hueMax != null) {
    const mid = profile.hueMin <= profile.hueMax ? (profile.hueMin + profile.hueMax) / 2 : (profile.hueMin + profile.hueMax + 360) / 2;
    h = mid % 360;
  }
  return {
    h,
    c: Math.min(profile.chromaMax, Math.max(profile.chromaMin, state.c)),
    l: Math.min(profile.lightnessMax, Math.max(profile.lightnessMin, state.l)),
  };
}
