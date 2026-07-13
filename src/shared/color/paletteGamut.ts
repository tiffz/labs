import { converter, formatHex } from 'culori';

import { colorStateToHex } from './convert';
import { clampColorState } from './formatOklch';
import type { PaletteGamutMode } from './paletteProfile';
import type { ColorState } from './types';

const toRgb = converter('rgb');

/** Reduce chroma until the color round-trips through sRGB hex without drift. */
export function fitColorToGamut(state: ColorState, mode: PaletteGamutMode): ColorState {
  const clamped = clampColorState(state);
  if (mode === 'wide') return clamped;

  let c = clamped.c;
  const step = 0.015;
  let best = clamped;
  while (c >= 0) {
    const candidate = clampColorState({ ...clamped, c });
    const rgb = toRgb({ mode: 'oklch', l: candidate.l, c: candidate.c, h: candidate.h });
    if (!rgb) break;
    const hex = formatHex(rgb);
    if (!hex) break;
    const inGamut =
      rgb.r != null &&
      rgb.g != null &&
      rgb.b != null &&
      rgb.r >= -0.001 &&
      rgb.r <= 1.001 &&
      rgb.g >= -0.001 &&
      rgb.g <= 1.001 &&
      rgb.b >= -0.001 &&
      rgb.b <= 1.001;
    if (inGamut) {
      best = candidate;
      if (hex.toLowerCase() === colorStateToHex(candidate).toLowerCase()) return candidate;
    }
    c -= step;
  }
  return best;
}

export function fitPaletteToGamut(colors: ColorState[], mode: PaletteGamutMode): ColorState[] {
  return colors.map((color) => fitColorToGamut(color, mode));
}
