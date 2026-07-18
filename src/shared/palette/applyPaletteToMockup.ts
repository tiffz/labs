import {
  colorStateToHex,
  ensureContrastHex,
  hexToColorState,
  type ColorState,
} from '../color';
import type { ComicPalette, PaletteSwatch } from './types';

export type MockupTintTarget = 'panelFill' | 'background' | 'bubble' | 'figure' | 'caption' | 'sfx' | 'sky' | 'ground';

export interface MockupTintSpec {
  panelIndex: number;
  target: MockupTintTarget;
  swatchIndex: number;
}

export interface MockupPaletteApplyResult {
  /** Soft per-panel underfill (usually sky-adjacent). */
  panelFills: string[];
  /** Page / gutter paper — kept neutral by comic convention (not palette-washed). */
  background: string;
  /** Speech balloons — kept paper-white for legibility. */
  bubble: string;
  figure: string;
  caption: string;
  /** Onomatopoeia fill (BAM/POW). Ignored by callers built before this field existed. */
  sfx: string;
  /** Horizon / sky band inside panels. */
  sky: string;
  /** Horizon / ground band inside panels. */
  ground: string;
}

const DEFAULT_GRAY = {
  panelFill: '#f5f5f0',
  background: '#ebe8e0',
  bubble: '#ffffff',
  figure: '#333333',
  caption: '#666666',
  sfx: '#222222',
  sky: '#dce9f5',
  ground: '#e8dcc8',
};

interface RankedSwatch {
  swatch: PaletteSwatch;
  state: ColorState;
}

function rankSwatches(swatches: PaletteSwatch[]): RankedSwatch[] {
  return swatches.map((swatch) => ({
    swatch,
    state: swatch.color ?? hexToColorState(swatch.hex) ?? { h: 0, c: 0, l: 0.5 },
  }));
}

function pastelSky(state: ColorState): string {
  return colorStateToHex({
    h: state.h,
    c: Math.min(Math.max(state.c * 0.45, 0.04), 0.11),
    l: Math.min(0.9, Math.max(0.78, state.l < 0.55 ? 0.84 : state.l + 0.12)),
  });
}

function pastelGround(state: ColorState): string {
  // Bias warm when the seed is cool so ground reads as earth against sky.
  const h = state.c < 0.04 ? 55 : state.h;
  return colorStateToHex({
    h,
    c: Math.min(Math.max(state.c * 0.4, 0.035), 0.1),
    l: Math.min(0.86, Math.max(0.68, state.l < 0.5 ? 0.76 : state.l + 0.06)),
  });
}

/**
 * Map a palette onto comic mockup roles using color-theory heuristics:
 * - `background` / `bubble` — stay neutral paper / white (not palette-washed)
 * - `sky` / `ground` — pastel scene bands from the palette
 * - `figure` — darkest swatch (reads as ink / character fill)
 * - `caption` — mid-chroma accent for props/details
 * - `sfx` — highest-chroma swatch (pops for onomatopoeia)
 * - `panelFills` — soft sky-adjacent underfills
 */
export function applyPaletteToMockup(
  palette: ComicPalette | null,
  panelCount: number,
): MockupPaletteApplyResult {
  if (!palette || palette.swatches.length === 0) {
    return {
      panelFills: Array.from({ length: panelCount }, () => DEFAULT_GRAY.panelFill),
      background: DEFAULT_GRAY.background,
      bubble: DEFAULT_GRAY.bubble,
      figure: DEFAULT_GRAY.figure,
      caption: DEFAULT_GRAY.caption,
      sfx: DEFAULT_GRAY.sfx,
      sky: DEFAULT_GRAY.sky,
      ground: DEFAULT_GRAY.ground,
    };
  }

  const ranked = rankSwatches(palette.swatches);
  const byLightnessAsc = [...ranked].sort((a, b) => a.state.l - b.state.l);
  const byChromaDesc = [...ranked].sort((a, b) => b.state.c - a.state.c);

  const figureEntry = byLightnessAsc[0]!;
  const lightEntry = byLightnessAsc[byLightnessAsc.length - 1]!;
  const midEntry = byLightnessAsc[Math.floor(byLightnessAsc.length / 2)]!;
  const sfxEntry = byChromaDesc[0]!;
  const captionEntry =
    byChromaDesc.find((entry) => entry !== sfxEntry && entry !== figureEntry) ??
    byChromaDesc[Math.min(1, byChromaDesc.length - 1)]!;

  const sky = pastelSky(lightEntry.state.c >= 0.03 ? lightEntry.state : midEntry.state);
  const ground = pastelGround(
    midEntry !== lightEntry ? midEntry.state : byChromaDesc[Math.min(1, byChromaDesc.length - 1)]!.state,
  );

  const bubble = DEFAULT_GRAY.bubble;
  const background = DEFAULT_GRAY.background;
  return {
    panelFills: Array.from({ length: panelCount }, () => sky),
    background,
    bubble,
    figure: ensureContrastHex(figureEntry.swatch.hex, bubble, 4.5),
    caption: ensureContrastHex(captionEntry.swatch.hex, bubble, 4.5),
    sfx: ensureContrastHex(sfxEntry.swatch.hex, background, 3),
    sky,
    ground,
  };
}
