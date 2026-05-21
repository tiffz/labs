import { getLevelConfig } from '../../levels';
import { meanBridgeVariancePct } from '../../scoring/bridgeVariance';
import type { BridgeChallenge, ColorState } from '../../types';

export function initialBridgeSteps(challenge: BridgeChallenge): ColorState[] {
  return challenge.referenceSteps.map((ref, i) =>
    challenge.emptyIndices.includes(i) ? { ...ref, l: 0.5 } : ref,
  );
}

export function scoreBridge(
  challenge: BridgeChallenge,
  userSteps: ColorState[],
  level: number,
  simulatePass: boolean | null,
): { passed: boolean; variancePct: number } {
  const maxPct = getLevelConfig(level).maxBridgeVariancePct ?? 6;
  const variancePct = meanBridgeVariancePct(
    challenge.referenceSteps,
    userSteps,
    challenge.emptyIndices,
  );
  if (simulatePass !== null) return { passed: simulatePass, variancePct };
  return { passed: variancePct <= maxPct, variancePct };
}
