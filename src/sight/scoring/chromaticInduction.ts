import { clampColorState } from './perceptualScore';
import { colorStateToOklab } from './oklab';
import { temperatureIndex } from './temperature';
import type { ColorState } from '../types';

/**
 * Rough simultaneous-contrast estimate: target appearance shifts away from
 * background hue in Oklab. Used for Albers "which looks warmer/darker" items.
 */
export function inducedAppearance(target: ColorState, background: ColorState): ColorState {
  const t = colorStateToOklab(target);
  const b = colorStateToOklab(background);
  const push = 0.22;
  const a = t.a - push * b.a;
  const bb = t.b - push * b.b;
  const l = t.l + push * (0.5 - b.l) * 0.15;
  const chroma = Math.sqrt(a * a + bb * bb);
  const h = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return clampColorState({
    l: Math.max(0.08, Math.min(0.92, l)),
    c: Math.min(0.38, chroma * 1.35),
    h,
  });
}

export function perceivedWarmerSide(
  left: { target: ColorState; background: ColorState },
  right: { target: ColorState; background: ColorState },
): 'left' | 'right' {
  const li = temperatureIndex(inducedAppearance(left.target, left.background));
  const ri = temperatureIndex(inducedAppearance(right.target, right.background));
  return li >= ri ? 'left' : 'right';
}

export function perceivedLighterSide(
  left: { target: ColorState; background: ColorState },
  right: { target: ColorState; background: ColorState },
): 'left' | 'right' {
  const ll = inducedAppearance(left.target, left.background).l;
  const rl = inducedAppearance(right.target, right.background).l;
  return ll >= rl ? 'left' : 'right';
}

export function perceivedMoreSaturatedSide(
  left: { target: ColorState; background: ColorState },
  right: { target: ColorState; background: ColorState },
): 'left' | 'right' {
  const lc = inducedAppearance(left.target, left.background).c;
  const rc = inducedAppearance(right.target, right.background).c;
  return lc >= rc ? 'left' : 'right';
}
