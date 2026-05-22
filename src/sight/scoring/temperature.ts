import { colorStateToOklab } from './oklab';
import type { ColorState } from '../types';

/** Warm pole in Oklab a*b* (orange-red). */
const WARM_POLE = { a: 0.11, b: 0.09 };
/** Cool pole in Oklab a*b* (cyan-blue). */
const COOL_POLE = { a: -0.1, b: -0.11 };

const WARM_COOL_AXIS = {
  a: WARM_POLE.a - COOL_POLE.a,
  b: WARM_POLE.b - COOL_POLE.b,
};

/**
 * Signed warm–cool index from Oklab. Higher = objectively warmer.
 * Objective anchor projection, not subjective taste.
 */
export function temperatureIndex(state: ColorState): number {
  const { a, b } = colorStateToOklab(state);
  return (a - COOL_POLE.a) * WARM_COOL_AXIS.a + (b - COOL_POLE.b) * WARM_COOL_AXIS.b;
}

export function warmerSide(left: ColorState, right: ColorState): 'left' | 'right' {
  const li = temperatureIndex(left);
  const ri = temperatureIndex(right);
  if (Math.abs(li - ri) < 1e-9) return 'left';
  return li >= ri ? 'left' : 'right';
}

export function coolerSide(left: ColorState, right: ColorState): 'left' | 'right' {
  const warm = warmerSide(left, right);
  return warm === 'left' ? 'right' : 'left';
}
