import { differenceCiede2000, oklch, type Oklch } from 'culori';
import type { ColorState } from '../types';

function toOklch(state: ColorState): Oklch {
  return oklch({ mode: 'oklch', l: state.l, c: state.c, h: state.h }) as Oklch;
}

/**
 * Mean ΔE of user-filled steps vs reference interpolation, as % of max observed ΔE scale (100 ≈ ΔE 25).
 */
export function meanBridgeVariancePct(
  reference: ColorState[],
  userSteps: ColorState[],
  emptyIndices: number[],
): number {
  if (emptyIndices.length === 0) return 0;

  let sum = 0;
  for (const i of emptyIndices) {
    const ref = toOklch(reference[i]!);
    const user = toOklch(userSteps[i]!);
    sum += differenceCiede2000()(ref, user) ?? 0;
  }
  const meanDe = sum / emptyIndices.length;
  return Math.min(100, (meanDe / 25) * 100);
}
