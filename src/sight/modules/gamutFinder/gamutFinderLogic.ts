import { getLevelConfig } from '../../levels';
import { gamutOverlapPct, colorsToWheelPoints } from '../../scoring/gamutOverlap';
import type { GamutChallenge } from '../../types';
import type { WheelPoint } from '../../scoring/gamutOverlap';

export function scoreGamut(
  challenge: GamutChallenge,
  userMask: WheelPoint[],
  level: number,
  simulatePass: boolean | null,
): { passed: boolean; overlapPct: number } {
  const minPct = getLevelConfig(level).minGamutOverlapPct ?? 72;
  const samples = colorsToWheelPoints([
    challenge.colors.skyA,
    challenge.colors.skyB,
    challenge.colors.bg,
    challenge.colors.mid,
    challenge.colors.fg,
  ]);
  const overlapPct = gamutOverlapPct(challenge.maskVertices, userMask, samples);
  if (simulatePass !== null) return { passed: simulatePass, overlapPct };
  return { passed: overlapPct >= minPct, overlapPct };
}
