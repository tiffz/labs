/**
 * SFX loudness → layout scale + wireframe-safe render treatments.
 */

import type { SfxLoudness } from './types';

export function normalizeSfxLoudness(loudness?: SfxLoudness | null): SfxLoudness {
  if (loudness === 'quiet' || loudness === 'loud') return loudness;
  return 'normal';
}

/** Relative font scale vs panel baseline. */
export function sfxLoudnessFontScale(loudness?: SfxLoudness | null): number {
  switch (normalizeSfxLoudness(loudness)) {
    case 'quiet':
      return 0.75;
    case 'loud':
      return 1.45;
    default:
      return 1;
  }
}

export type SfxRenderStyle = {
  loudness: SfxLoudness;
  fontWeight: number;
  fill: string;
  letterSpacing: number;
  /** Degrees; 0 for quiet/normal. */
  rotateDeg: number;
  outline: boolean;
  burstTicks: boolean;
};

export function sfxRenderStyle(loudness?: SfxLoudness | null, text = ''): SfxRenderStyle {
  const level = normalizeSfxLoudness(loudness);
  if (level === 'quiet') {
    return {
      loudness: level,
      fontWeight: 600,
      fill: '#666666',
      letterSpacing: 0.5,
      rotateDeg: 0,
      outline: false,
      burstTicks: false,
    };
  }
  if (level === 'loud') {
    // Stable per-string tilt so layout tests stay deterministic.
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
    const rotateDeg = hash % 2 === 0 ? -9 : 11;
    return {
      loudness: level,
      fontWeight: 900,
      fill: '#222222',
      letterSpacing: 1.6,
      rotateDeg,
      outline: true,
      burstTicks: true,
    };
  }
  return {
    loudness: level,
    fontWeight: 800,
    fill: '#333333',
    letterSpacing: 0.8,
    rotateDeg: 0,
    outline: false,
    burstTicks: false,
  };
}

export function sfxBaseFontSize(panelWidth: number, loudness?: SfxLoudness | null): number {
  const base = Math.max(12, Math.min(22, panelWidth * 0.12));
  const scaled = Math.round(base * sfxLoudnessFontScale(loudness));
  // Keep loud visually bigger even when quiet hits the soft floor.
  if (normalizeSfxLoudness(loudness) === 'loud') return Math.max(scaled, 16);
  if (normalizeSfxLoudness(loudness) === 'quiet') return Math.min(scaled, 14);
  return scaled;
}
