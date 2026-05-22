import { getLevelConfig } from '../levels';
import type { PracticeGenConstraints } from '../progress/types';
import { clampColorState } from '../scoring/perceptualScore';
import type { AlbersEqualizerChallenge, AlbersEqualizerPair, AlbersField, ColorState } from '../types';
import { createRng } from './rng';

function pickInRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function warmCoolFields(rng: () => number, minBgC: number): { left: AlbersField; right: AlbersField } {
  const target = clampColorState({
    h: pickInRange(rng, 200, 260),
    c: pickInRange(rng, 0.06, 0.12),
    l: pickInRange(rng, 0.48, 0.58),
  });
  const warmBg = clampColorState({
    h: pickInRange(rng, 30, 55),
    c: Math.max(minBgC, pickInRange(rng, 0.14, 0.28)),
    l: pickInRange(rng, 0.5, 0.7),
  });
  const coolBg = clampColorState({
    h: pickInRange(rng, 210, 250),
    c: Math.max(minBgC, pickInRange(rng, 0.12, 0.26)),
    l: pickInRange(rng, 0.42, 0.62),
  });
  return {
    left: { background: warmBg, target: { ...target } },
    right: { background: coolBg, target: { ...target } },
  };
}

export function generateAlbersEqualizerChallenge(
  seed: number,
  level: number,
  constraints?: PracticeGenConstraints,
): AlbersEqualizerChallenge {
  const rng = createRng(seed);
  const minBgC = constraints?.minBackgroundChroma ?? 0.1;
  const pair: AlbersEqualizerPair = level % 2 === 0 ? 'saturation-contrast' : 'warm-cool';
  const { left, right } = warmCoolFields(rng, minBgC);

  if (pair === 'saturation-contrast') {
    const inner: ColorState = clampColorState({
      h: pickInRange(rng, 120, 180),
      c: 0.08,
      l: 0.52,
    });
    left.target = { ...inner };
    right.target = { ...inner };
    left.background = clampColorState({ ...left.background, c: 0.06 });
    right.background = clampColorState({ ...right.background, c: 0.28 });
  }

  void getLevelConfig(level);
  return { kind: 'albers-equalizer', seed, left, right, backgroundPair: pair };
}
