import { getLevelConfig } from '../levels';
import type { HarmonySystem, AnchorPivotChallenge } from '../types';
import { createRng } from './rng';

const SYSTEM_OFFSETS: Record<HarmonySystem, number[]> = {
  complementary: [0, 180],
  splitComplementary: [0, 150, 210],
  triadic: [0, 120, 240],
  tetradic: [0, 90, 180, 270],
};

const SYSTEM_BY_LEVEL: HarmonySystem[] = ['complementary', 'splitComplementary', 'triadic', 'tetradic'];

export function generateAnchorPivotChallenge(seed: number, level: number): AnchorPivotChallenge {
  const rng = createRng(seed);
  const system = SYSTEM_BY_LEVEL[(level - 21) % SYSTEM_BY_LEVEL.length] ?? 'complementary';
  const pivotHue = rng() * 360;
  const offsets = SYSTEM_OFFSETS[system];
  const targetAngles = offsets.map((o) => (pivotHue + o) % 360);
  const targetChroma = 0.12 + rng() * 0.18;
  const targetLightness = 0.5 + rng() * 0.12;

  void getLevelConfig(level);
  return {
    kind: 'anchor-pivot',
    seed,
    system,
    targetAngles,
    targetChroma,
    targetLightness,
    pivotHue,
  };
}

export function hueDistance(a: number, b: number): number {
  const d = Math.abs(((a - b + 540) % 360) - 180);
  return d;
}

export function scoreAnchorPivot(
  challenge: AnchorPivotChallenge,
  userHue: number,
  maxErrorDeg = 12,
): { passed: boolean; angularScore: number; maxAngularError: number } {
  const userAngles = challenge.targetAngles.map((_, i) => {
    const offset = SYSTEM_OFFSETS[challenge.system][i] ?? 0;
    return (userHue + offset) % 360;
  });
  const errors = challenge.targetAngles.map((t, i) => hueDistance(t, userAngles[i]!));
  const maxAngularError = Math.max(...errors);
  const angularScore = Math.max(0, Math.round(100 - maxAngularError * 4));
  return {
    passed: maxAngularError <= maxErrorDeg,
    angularScore,
    maxAngularError,
  };
}
