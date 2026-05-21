import { differenceCiede2000, formatHex, oklch, type Oklch } from 'culori';
import type { ColorState } from '../types';

export interface PerceptualScoreResult {
  pass: boolean;
  deltaE: number;
  accuracyRating: number;
}

function toOklch(state: ColorState): Oklch {
  return oklch({ mode: 'oklch', l: state.l, c: state.c, h: state.h }) as Oklch;
}

/**
 * Human-eye perceptual difference (CIEDE2000) in Oklch space.
 */
export function calculatePerceptualScore(
  target: ColorState,
  input: ColorState,
  maxDeltaE: number,
): PerceptualScoreResult {
  const targetOklch = toOklch(target);
  const inputOklch = toOklch(input);
  const deltaE = differenceCiede2000()(targetOklch, inputOklch) ?? 0;
  const accuracyRating = Math.max(0, Math.min(100, 100 - deltaE * 4));

  return {
    pass: deltaE <= maxDeltaE,
    deltaE,
    accuracyRating,
  };
}

export function colorStateToHex(state: ColorState): string {
  const parsed = oklch({ mode: 'oklch', l: state.l, c: state.c, h: state.h });
  return formatHex(parsed) ?? '#000000';
}

export function clampColorState(state: ColorState): ColorState {
  return {
    h: ((state.h % 360) + 360) % 360,
    c: Math.max(0, Math.min(0.4, state.c)),
    l: Math.max(0, Math.min(1, state.l)),
  };
}
