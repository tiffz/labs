import { getLevelConfig } from '../../levels';
import { calculatePerceptualScore } from '../../scoring/perceptualScore';
import type { AlbersEqualizerChallenge, ColorState } from '../../types';

export function initialEqualizerInput(challenge: AlbersEqualizerChallenge): ColorState {
  return { ...challenge.right.target, l: challenge.right.target.l + 0.08 };
}

export function scoreEqualizer(
  challenge: AlbersEqualizerChallenge,
  input: ColorState,
  level: number,
  simulatePass: boolean | null,
): { passed: boolean; accuracyRating: number; deltaE: number } {
  if (simulatePass !== null) {
    return { passed: simulatePass, accuracyRating: simulatePass ? 92 : 40, deltaE: simulatePass ? 2 : 9 };
  }
  const maxDe = getLevelConfig(level).maxDeltaE ?? 4;
  const r = calculatePerceptualScore(challenge.left.target, input, maxDe);
  return { passed: r.pass, accuracyRating: r.accuracyRating, deltaE: r.deltaE };
}
