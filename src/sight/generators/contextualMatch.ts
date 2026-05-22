import { getLevelConfig } from '../levels';
import type { PracticeGenConstraints } from '../progress/types';
import type { ColorState, ContextualChallenge, ContextualProfile } from '../types';
import { createRng } from './rng';

export const FLAT_NEUTRAL_BACKGROUND: ColorState = { h: 0, c: 0.02, l: 0.55 };

function pickInRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function lockedFromProfile(profile: ContextualProfile): { hue: boolean; chroma: boolean } {
  switch (profile) {
    case 'adjacentFlat':
    case 'flatNeutral':
    case 'valueLocked':
      return { hue: true, chroma: true };
    case 'hueLocked':
      return { hue: true, chroma: false };
    case 'full':
      return { hue: false, chroma: false };
  }
}

export function generateContextualMatchChallenge(
  seed: number,
  level: number,
  constraints?: PracticeGenConstraints,
): ContextualChallenge {
  const rng = createRng(seed);
  const profile = constraints?.contextualProfile ?? getLevelConfig(level).contextualProfile ?? 'valueLocked';
  const locked = lockedFromProfile(profile);
  const hue = constraints?.hueRange
    ? pickInRange(rng, constraints.hueRange[0], constraints.hueRange[1])
    : pickInRange(rng, 0, 360);

  const target: ColorState = {
    h: hue,
    c: locked.chroma ? 0.06 : pickInRange(rng, 0.04, 0.18),
    l: pickInRange(rng, 0.35, 0.72),
  };

  if (profile === 'adjacentFlat') {
    const sign = rng() < 0.5 ? -1 : 1;
    const startLightnessDelta = sign * pickInRange(rng, 0.12, 0.22);
    return {
      kind: 'contextual',
      seed,
      target,
      background: { ...FLAT_NEUTRAL_BACKGROUND },
      locked,
      display: 'adjacent',
      startLightnessDelta,
    };
  }

  if (profile === 'flatNeutral') {
    return {
      kind: 'contextual',
      seed,
      target,
      background: { ...FLAT_NEUTRAL_BACKGROUND },
      locked,
      display: 'flat',
    };
  }

  const complementHue = (hue + 180) % 360;
  const minBgC = constraints?.minBackgroundChroma ?? 0.14;
  const background: ColorState = {
    h: complementHue,
    c: pickInRange(rng, minBgC, 0.32),
    l: pickInRange(rng, 0.42, 0.68),
  };

  return {
    kind: 'contextual',
    seed,
    target,
    background,
    locked,
    display: 'contextual',
  };
}
