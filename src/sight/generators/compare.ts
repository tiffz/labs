import { getLevelConfig } from '../levels';
import type { ColorState, CompareAxis, CompareChallenge, CompareProfile } from '../types';
import { createRng } from './rng';

const LIGHT_AXES: CompareAxis[] = ['lighter', 'darker'];
const SAT_AXES: CompareAxis[] = ['moreSaturated', 'lessSaturated'];
const MIXED_AXES: CompareAxis[] = ['lighter', 'darker', 'moreSaturated', 'lessSaturated'];

function pickInRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function baseColor(rng: () => number): ColorState {
  return {
    h: pickInRange(rng, 0, 360),
    c: pickInRange(rng, 0.05, 0.2),
    l: pickInRange(rng, 0.35, 0.65),
  };
}

type DeltaScale = 'wide' | 'narrow';

function deltaRanges(scale: DeltaScale): { deltaL: [number, number]; deltaC: [number, number] } {
  if (scale === 'narrow') {
    return { deltaL: [0.06, 0.12], deltaC: [0.03, 0.07] };
  }
  return { deltaL: [0.1, 0.22], deltaC: [0.06, 0.14] };
}

function applyAxisDelta(
  base: ColorState,
  axis: CompareAxis,
  deltaL: number,
  deltaC: number,
): { high: ColorState; low: ColorState } {
  let high = { ...base };
  let low = { ...base };

  switch (axis) {
    case 'lighter':
      high = { ...base, l: Math.min(0.92, base.l + deltaL) };
      low = { ...base, l: Math.max(0.08, base.l - deltaL * 0.85) };
      break;
    case 'darker':
      high = { ...base, l: Math.min(0.92, base.l + deltaL * 0.85) };
      low = { ...base, l: Math.max(0.08, base.l - deltaL) };
      break;
    case 'moreSaturated':
      high = { ...base, c: Math.min(0.38, base.c + deltaC) };
      low = { ...base, c: Math.max(0.02, base.c - deltaC * 0.7) };
      break;
    case 'lessSaturated':
      high = { ...base, c: Math.min(0.38, base.c + deltaC * 0.7) };
      low = { ...base, c: Math.max(0.02, base.c - deltaC) };
      break;
  }

  return { high, low };
}

function correctSideForAxis(
  axis: CompareAxis,
  left: ColorState,
  right: ColorState,
): 'left' | 'right' {
  switch (axis) {
    case 'lighter':
      return left.l >= right.l ? 'left' : 'right';
    case 'darker':
      return left.l <= right.l ? 'left' : 'right';
    case 'moreSaturated':
      return left.c >= right.c ? 'left' : 'right';
    case 'lessSaturated':
      return left.c <= right.c ? 'left' : 'right';
  }
}

function pairForAxis(
  rng: () => number,
  axis: CompareAxis,
  options: { sameHue: boolean; scale: DeltaScale },
): { left: ColorState; right: ColorState; correct: 'left' | 'right' } {
  const { deltaL: dL, deltaC: dC } = deltaRanges(options.scale);
  const deltaL = pickInRange(rng, dL[0], dL[1]);
  const deltaC = pickInRange(rng, dC[0], dC[1]);

  const leftBase = baseColor(rng);
  const rightBase = options.sameHue ? leftBase : baseColor(rng);

  const leftPair = applyAxisDelta(leftBase, axis, deltaL, deltaC);
  const rightPair = applyAxisDelta(rightBase, axis, deltaL, deltaC);

  const swap = rng() < 0.5;
  const left = swap ? leftPair.low : leftPair.high;
  const right = swap ? rightPair.high : rightPair.low;

  return { left, right, correct: correctSideForAxis(axis, left, right) };
}

function axesForProfile(profile: CompareProfile): CompareAxis[] {
  switch (profile) {
    case 'light':
      return LIGHT_AXES;
    case 'saturationEasy':
    case 'saturationHard':
      return SAT_AXES;
    case 'mixed':
      return MIXED_AXES;
  }
}

function generateForProfile(
  rng: () => number,
  profile: CompareProfile,
): { left: ColorState; right: ColorState; correct: 'left' | 'right'; axis: CompareAxis } {
  const axes = axesForProfile(profile);
  const axis = axes[Math.floor(rng() * axes.length)]!;

  if (profile === 'saturationHard') {
    const crossHue = rng() < 0.5;
    return { axis, ...pairForAxis(rng, axis, { sameHue: !crossHue, scale: 'narrow' }) };
  }

  return { axis, ...pairForAxis(rng, axis, { sameHue: true, scale: 'wide' }) };
}

export function comparePrompt(axis: CompareAxis): string {
  switch (axis) {
    case 'lighter':
      return 'Which swatch is lighter?';
    case 'darker':
      return 'Which swatch is darker?';
    case 'moreSaturated':
      return 'Which swatch is more vivid?';
    case 'lessSaturated':
      return 'Which swatch is less vivid?';
  }
}

export function generateCompareChallenge(
  seed: number,
  level: number,
  profileOverride?: CompareProfile,
): CompareChallenge {
  const rng = createRng(seed);
  const profile = profileOverride ?? getLevelConfig(level).compareProfile ?? 'light';
  const { left, right, correct, axis } = generateForProfile(rng, profile);

  return {
    kind: 'compare',
    seed,
    axis,
    left,
    right,
    correctSide: correct,
  };
}
