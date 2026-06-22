import { getLevelConfig } from '../levels';
import type { PracticeGenConstraints } from '../progress/types';
import type { ColorState, ContextualChallenge, ContextualLocks, ContextualProfile } from '../types';
import { createRng } from './rng';

export const FLAT_NEUTRAL_BACKGROUND: ColorState = { h: 0, c: 0.02, l: 0.55 };

function pickInRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function lockedFromProfile(profile: ContextualProfile): ContextualLocks {
  switch (profile) {
    case 'adjacentFlat':
    case 'flatNeutral':
    case 'valueLocked':
      return { lightness: false, chroma: true, hue: true };
    case 'chromaLocked':
      return { lightness: true, chroma: false, hue: true };
    case 'hueLocked':
      return { lightness: false, chroma: false, hue: true };
    case 'lightnessChromaLocked':
      return { lightness: true, chroma: true, hue: false };
    case 'full':
      return { lightness: false, chroma: false, hue: false };
  }
}

function contextualBackground(
  rng: () => number,
  hue: number,
  constraints?: PracticeGenConstraints,
): ColorState {
  const complementHue = (hue + 180) % 360;
  const minBgC = constraints?.minBackgroundChroma ?? 0.14;
  return {
    h: complementHue,
    c: pickInRange(rng, minBgC, 0.32),
    l: pickInRange(rng, 0.42, 0.68),
  };
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

  const background = contextualBackground(rng, hue, constraints);
  const base = {
    kind: 'contextual' as const,
    seed,
    target,
    background,
    locked,
    display: 'contextual' as const,
  };

  if (profile === 'chromaLocked') {
    const sign = rng() < 0.5 ? -1 : 1;
    return {
      ...base,
      startChromaDelta: sign * pickInRange(rng, 0.06, 0.14),
    };
  }

  if (profile === 'lightnessChromaLocked') {
    const sign = rng() < 0.5 ? -1 : 1;
    return {
      ...base,
      startHueDelta: sign * pickInRange(rng, 28, 55),
    };
  }

  return base;
}
