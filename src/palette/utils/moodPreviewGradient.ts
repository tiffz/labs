import {
  colorStateToHex,
  generateRandomPalettes,
  PALETTE_MOOD_PRESETS,
  type PaletteMoodPreset,
} from '../../shared/color';

const MIXED_PREVIEW =
  'linear-gradient(90deg, #ff5c8a 0%, #ffd166 25%, #06d6a0 50%, #4cc9f0 75%, #7b2cbf 100%)';

function presetSeed(preset: string): number {
  let hash = 0;
  for (let i = 0; i < preset.length; i++) {
    hash = (hash * 31 + preset.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

function gradientFromHexes(hexes: string[]): string {
  const stops = hexes.map((hex, index, list) => {
    const start = (index / list.length) * 100;
    const end = ((index + 1) / list.length) * 100;
    return `${hex} ${start}% ${end}%`;
  });
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

/** Deterministic mini swatch strip for mood preset cards in settings. */
export function moodPreviewGradient(preset: PaletteMoodPreset): string {
  if (preset === 'mixed') return MIXED_PREVIEW;
  if (preset === 'custom') {
    return 'linear-gradient(90deg, #8e8e93 0%, #c7c7cc 50%, #636366 100%)';
  }

  const profile = PALETTE_MOOD_PRESETS[preset];
  const sample = generateRandomPalettes(profile, {
    count: 1,
    swatches: 5,
    seed: presetSeed(preset),
    templates: ['balanced'],
  })[0];
  if (!sample) return MIXED_PREVIEW;
  return gradientFromHexes(sample.colors.map(colorStateToHex));
}

export function moodPreviewLabel(preset: PaletteMoodPreset): string {
  if (preset === 'custom') return 'Custom';
  if (preset === 'mixed') return 'Mixed';
  return PALETTE_MOOD_PRESETS[preset].label;
}
