import { getLevelConfig } from '../levels';
import type { BridgeChallenge, ColorState } from '../types';
import { createRng } from './rng';

function lerpOklch(a: ColorState, b: ColorState, t: number): ColorState {
  const dh = ((b.h - a.h + 540) % 360) - 180;
  return {
    h: (a.h + dh * t + 360) % 360,
    c: a.c + (b.c - a.c) * t,
    l: a.l + (b.l - a.l) * t,
  };
}

export function generateBridgeChallenge(seed: number, level: number): BridgeChallenge {
  const rng = createRng(seed);
  const stepCount = 5;
  const pick = (min: number, max: number) => min + rng() * (max - min);
  const profile = getLevelConfig(level).bridgeProfile ?? 'singleAxis';

  let keyA: ColorState;
  let keyB: ColorState;

  if (profile === 'singleAxis') {
    const hue = pick(20, 50);
    keyA = { h: hue, c: 0.06, l: pick(0.72, 0.88) };
    keyB = { h: hue, c: 0.08, l: pick(0.22, 0.38) };
  } else {
    keyA = { h: pick(25, 45), c: pick(0.1, 0.16), l: pick(0.75, 0.9) };
    keyB = { h: pick(200, 240), c: pick(0.08, 0.14), l: pick(0.18, 0.35) };
  }

  const referenceSteps: ColorState[] = [];
  for (let i = 0; i < stepCount; i++) {
    referenceSteps.push(lerpOklch(keyA, keyB, i / (stepCount - 1)));
  }

  const emptyIndices = [1, 2, 3];

  return {
    kind: 'bridge',
    seed,
    keyA,
    keyB,
    referenceSteps,
    emptyIndices,
    stepCount,
  };
}
