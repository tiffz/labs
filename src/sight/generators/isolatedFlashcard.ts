import { getLevelConfig } from '../levels';
import type { PracticeGenConstraints } from '../progress/types';
import { clampColorState } from '../scoring/perceptualScore';
import { coolerSide, warmerSide } from '../scoring/temperature';
import type {
  ColorState,
  CompareAxis,
  IsolatedAxis,
  IsolatedFlashcardChallenge,
  IsolatedProfile,
} from '../types';
import { createRng } from './rng';

const VALUE_AXES: CompareAxis[] = ['lighter', 'darker'];
const CHROMA_AXES: CompareAxis[] = ['moreSaturated', 'lessSaturated'];
const TEMP_AXES: IsolatedAxis[] = ['warmer', 'cooler'];

function pickInRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

type DeltaScale = 'wide' | 'narrow';

function deltaRanges(scale: DeltaScale): { deltaL: [number, number]; deltaC: [number, number]; deltaH: [number, number] } {
  if (scale === 'narrow') {
    return { deltaL: [0.05, 0.1], deltaC: [0.025, 0.06], deltaH: [8, 18] };
  }
  return { deltaL: [0.1, 0.22], deltaC: [0.06, 0.14], deltaH: [15, 40] };
}

function baseColor(rng: () => number, options: { grayscale?: boolean; hueSpread?: boolean }): ColorState {
  const h = options.hueSpread ? pickInRange(rng, 0, 360) : pickInRange(rng, 20, 50);
  const c = options.grayscale ? pickInRange(rng, 0, 0.04) : pickInRange(rng, 0.05, 0.2);
  return clampColorState({
    h,
    c,
    l: pickInRange(rng, 0.35, 0.65),
  });
}

function applyAxisDelta(
  base: ColorState,
  axis: IsolatedAxis,
  deltaL: number,
  deltaC: number,
  deltaH: number,
): { high: ColorState; low: ColorState } {
  switch (axis) {
    case 'lighter':
      return {
        high: clampColorState({ ...base, l: Math.min(0.92, base.l + deltaL) }),
        low: clampColorState({ ...base, l: Math.max(0.08, base.l - deltaL * 0.85) }),
      };
    case 'darker':
      return {
        high: clampColorState({ ...base, l: Math.min(0.92, base.l + deltaL * 0.85) }),
        low: clampColorState({ ...base, l: Math.max(0.08, base.l - deltaL) }),
      };
    case 'moreSaturated':
      return {
        high: clampColorState({ ...base, c: Math.min(0.38, base.c + deltaC) }),
        low: clampColorState({ ...base, c: Math.max(0.02, base.c - deltaC * 0.7) }),
      };
    case 'lessSaturated':
      return {
        high: clampColorState({ ...base, c: Math.min(0.38, base.c + deltaC * 0.7) }),
        low: clampColorState({ ...base, c: Math.max(0.02, base.c - deltaC) }),
      };
    case 'warmer':
      return {
        high: clampColorState({
          ...base,
          h: (base.h + deltaH) % 360,
          c: Math.min(0.38, base.c + deltaC * 0.5),
        }),
        low: clampColorState({
          ...base,
          h: (base.h - deltaH + 360) % 360,
          c: Math.max(0.02, base.c - deltaC * 0.35),
        }),
      };
    case 'cooler':
      return {
        high: clampColorState({
          ...base,
          h: (base.h - deltaH + 360) % 360,
          c: Math.max(0.02, base.c - deltaC * 0.35),
        }),
        low: clampColorState({
          ...base,
          h: (base.h + deltaH) % 360,
          c: Math.min(0.38, base.c + deltaC * 0.5),
        }),
      };
  }
}

function correctSideForAxis(axis: IsolatedAxis, left: ColorState, right: ColorState): 'left' | 'right' {
  if (axis === 'warmer' || axis === 'cooler') {
    const warm = warmerSide(left, right);
    return axis === 'warmer' ? warm : coolerSide(left, right);
  }
  switch (axis) {
    case 'lighter':
      return left.l >= right.l ? 'left' : 'right';
    case 'darker':
      return left.l <= right.l ? 'left' : 'right';
    case 'moreSaturated':
      return left.c >= right.c ? 'left' : 'right';
    case 'lessSaturated':
      return left.c <= right.c ? 'left' : 'right';
    default:
      return 'left';
  }
}

function pairForAxis(
  rng: () => number,
  axis: IsolatedAxis,
  options: { sameHue: boolean; scale: DeltaScale; grayscale?: boolean; hueSpread?: boolean },
): { left: ColorState; right: ColorState; correct: 'left' | 'right' } {
  const { deltaL: dL, deltaC: dC, deltaH: dH } = deltaRanges(options.scale);
  const deltaL = pickInRange(rng, dL[0], dL[1]);
  const deltaC = pickInRange(rng, dC[0], dC[1]);
  const deltaH = pickInRange(rng, dH[0], dH[1]);

  const leftBase = baseColor(rng, { grayscale: options.grayscale, hueSpread: options.hueSpread });
  const rightBase = options.sameHue ? leftBase : baseColor(rng, { grayscale: options.grayscale, hueSpread: options.hueSpread });

  const leftPair = applyAxisDelta(leftBase, axis, deltaL, deltaC, deltaH);
  const rightPair = applyAxisDelta(rightBase, axis, deltaL, deltaC, deltaH);

  const swap = rng() < 0.5;
  const left = swap ? leftPair.low : leftPair.high;
  const right = swap ? rightPair.high : rightPair.low;

  return { left, right, correct: correctSideForAxis(axis, left, right) };
}

function axesForProfile(profile: IsolatedProfile): IsolatedAxis[] {
  switch (profile) {
    case 'valueGrayscale':
    case 'valueHueContrast':
    case 'valueNearMatch':
      return VALUE_AXES;
    case 'chromaEasy':
    case 'chromaHard':
      return CHROMA_AXES;
    case 'temperatureUndertone':
    case 'temperatureHueBoundary':
      return TEMP_AXES;
  }
}

function generateForProfile(
  rng: () => number,
  profile: IsolatedProfile,
): { left: ColorState; right: ColorState; correct: 'left' | 'right'; axis: IsolatedAxis } {
  const axes = axesForProfile(profile);
  const axis = axes[Math.floor(rng() * axes.length)]!;

  switch (profile) {
    case 'valueGrayscale':
      return {
        axis,
        ...pairForAxis(rng, axis, { sameHue: true, scale: 'wide', grayscale: true }),
      };
    case 'valueHueContrast':
      return {
        axis,
        ...pairForAxis(rng, axis, { sameHue: false, scale: 'wide', hueSpread: true }),
      };
    case 'valueNearMatch':
      return {
        axis,
        ...pairForAxis(rng, axis, { sameHue: true, scale: 'narrow' }),
      };
    case 'chromaEasy':
      return {
        axis,
        ...pairForAxis(rng, axis, { sameHue: true, scale: 'wide' }),
      };
    case 'chromaHard':
      return {
        axis,
        ...pairForAxis(rng, axis, { sameHue: rng() < 0.4, scale: 'narrow' }),
      };
    case 'temperatureUndertone':
      return {
        axis,
        ...pairForAxis(rng, axis, { sameHue: true, scale: 'wide' }),
      };
    case 'temperatureHueBoundary':
      return {
        axis,
        ...pairForAxis(rng, axis, { sameHue: false, scale: 'narrow', hueSpread: true }),
      };
  }
}

export function isolatedPrompt(axis: IsolatedAxis): string {
  switch (axis) {
    case 'lighter':
      return 'Which swatch is lighter?';
    case 'darker':
      return 'Which swatch is darker?';
    case 'moreSaturated':
      return 'Which swatch is more saturated?';
    case 'lessSaturated':
      return 'Which swatch is less saturated?';
    case 'warmer':
      return 'Which swatch is warmer?';
    case 'cooler':
      return 'Which swatch is cooler?';
  }
}

export function generateIsolatedFlashcardChallenge(
  seed: number,
  level: number,
  constraints?: PracticeGenConstraints,
): IsolatedFlashcardChallenge {
  const rng = createRng(seed);
  const profile =
    constraints?.isolatedProfile ?? getLevelConfig(level).isolatedProfile ?? 'valueGrayscale';
  const { left, right, correct, axis } = generateForProfile(rng, profile);

  return {
    kind: 'flashcard-isolated',
    seed,
    profile,
    axis,
    left,
    right,
    correctSide: correct,
  };
}
