import { getLevelConfig } from '../levels';
import type { PracticeGenConstraints } from '../progress/types';
import { clampColorState } from '../scoring/perceptualScore';
import type { ColorState, MunsellSliceChallenge, MunsellSliceAxis } from '../types';
import { createRng } from './rng';

function pickInRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function generateMunsellSliceChallenge(
  seed: number,
  level: number,
  constraints?: PracticeGenConstraints,
): MunsellSliceChallenge {
  const rng = createRng(seed);
  const axis: MunsellSliceAxis = level % 2 === 0 ? 'chroma' : 'value';
  const hue = constraints?.hueRange
    ? pickInRange(rng, constraints.hueRange[0], constraints.hueRange[1])
    : pickInRange(rng, 10, 340);
  const baseL = pickInRange(rng, 0.38, 0.68);
  const baseC = pickInRange(rng, 0.08, 0.22);

  const swatches: ColorState[] = [];
  for (let i = 0; i < 5; i++) {
    swatches.push(
      clampColorState({
        h: hue + pickInRange(rng, -4, 4),
        l: axis === 'value' ? baseL + pickInRange(rng, -0.04, 0.04) : baseL,
        c: axis === 'chroma' ? baseC + pickInRange(rng, -0.03, 0.03) : baseC,
      }),
    );
  }

  const outlierIndex = Math.floor(rng() * 5);
  const outlier = swatches[outlierIndex]!;
  swatches[outlierIndex] =
    axis === 'value'
      ? clampColorState({ ...outlier, l: outlier.l + (rng() < 0.5 ? 0.14 : -0.14) })
      : clampColorState({ ...outlier, c: outlier.c + (rng() < 0.5 ? 0.1 : -0.1) });

  void getLevelConfig(level);
  return { kind: 'munsell-slice', seed, axis, swatches, outlierIndex };
}
