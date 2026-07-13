import type { ColorState } from './types';

/** Lightness as 0–100% for CSS `oklch()` syntax. */
export function formatOklchLightnessPercent(l: number): string {
  return `${(l * 100).toFixed(1)}%`;
}

/** Standard CSS Color Level 4 oklch() string. */
export function formatOklchCss(state: ColorState): string {
  return `oklch(${formatOklchLightnessPercent(state.l)} ${state.c.toFixed(3)} ${state.h.toFixed(1)})`;
}

export function clampColorState(state: ColorState): ColorState {
  return {
    h: ((state.h % 360) + 360) % 360,
    c: Math.max(0, Math.min(0.4, state.c)),
    l: Math.max(0, Math.min(1, state.l)),
  };
}
