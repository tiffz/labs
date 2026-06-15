import { clampColorState } from './perceptualScore';
import { colorStateToOklab } from './oklab';
import { temperatureIndex } from './temperature';
import type { AlbersField, AlbersQuestionKind, ColorState } from '../types';

/** Minimum induced gaps — items below these feel like guessing (see CURRICULUM.md). */
export const MIN_INDUCED_DELTAS = {
  perceivedLighter: 0.006,
  perceivedDarker: 0.006,
  perceivedWarmer: 0.032,
  perceivedCooler: 0.032,
  perceivedMoreSaturated: 0.04,
  perceivedLessSaturated: 0.04,
} as const satisfies Partial<Record<AlbersQuestionKind, number>>;

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

export function inducedDeltaForQuestion(
  question: AlbersQuestionKind,
  left: AlbersField,
  right: AlbersField,
): number {
  switch (question) {
    case 'perceivedLighter':
    case 'perceivedDarker': {
      const ll = inducedAppearance(left.target, left.background).l;
      const rl = inducedAppearance(right.target, right.background).l;
      return Math.abs(ll - rl);
    }
    case 'perceivedWarmer':
    case 'perceivedCooler': {
      const li = temperatureIndex(inducedAppearance(left.target, left.background));
      const ri = temperatureIndex(inducedAppearance(right.target, right.background));
      return Math.abs(li - ri);
    }
    case 'perceivedMoreSaturated':
    case 'perceivedLessSaturated': {
      const lc = inducedAppearance(left.target, left.background).c;
      const rc = inducedAppearance(right.target, right.background).c;
      return Math.abs(lc - rc);
    }
    default:
      return 0;
  }
}

export function meetsMinimumInducedDelta(
  question: AlbersQuestionKind,
  left: AlbersField,
  right: AlbersField,
): boolean {
  const min = MIN_INDUCED_DELTAS[question as keyof typeof MIN_INDUCED_DELTAS];
  if (min === undefined) return true;
  return inducedDeltaForQuestion(question, left, right) >= min;
}
