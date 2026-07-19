import type { ColorState } from './types';

/** Lightness as 0–100% for CSS `oklch()` syntax. */
export function formatOklchLightnessPercent(l: number): string {
  return `${(l * 100).toFixed(1)}%`;
}

/** Standard CSS Color Level 4 oklch() string. */
export function formatOklchCss(state: ColorState): string {
  return `oklch(${formatOklchLightnessPercent(state.l)} ${state.c.toFixed(3)} ${state.h.toFixed(1)})`;
}

export interface OklchFormattedChannels {
  l: string;
  c: string;
  h: string;
  css: string;
}

/** Per-channel display strings (percent lightness, 3-decimal chroma, degree hue). */
export function formatOklchChannels(state: ColorState): OklchFormattedChannels {
  return {
    l: formatOklchLightnessPercent(state.l),
    c: state.c.toFixed(3),
    h: `${state.h.toFixed(1)}°`,
    css: formatOklchCss(state),
  };
}

export function clampColorState(state: ColorState): ColorState {
  return {
    h: ((state.h % 360) + 360) % 360,
    c: Math.max(0, Math.min(0.4, state.c)),
    l: Math.max(0, Math.min(1, state.l)),
  };
}
