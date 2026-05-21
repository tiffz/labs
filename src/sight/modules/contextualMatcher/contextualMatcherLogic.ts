import { getLevelConfig } from '../../levels';
import { calculatePerceptualScore, clampColorState } from '../../scoring/perceptualScore';
import type { ColorState, ContextualChallenge } from '../../types';

export function initialContextualInput(challenge: ContextualChallenge): ColorState {
  if (challenge.display === 'adjacent' && challenge.startLightnessDelta !== undefined) {
    return clampColorState({
      h: challenge.locked.hue ? challenge.target.h : 0,
      c: challenge.locked.chroma ? challenge.target.c : 0.08,
      l: challenge.target.l + challenge.startLightnessDelta,
    });
  }
  return {
    h: challenge.locked.hue ? challenge.target.h : 0,
    c: challenge.locked.chroma ? challenge.target.c : 0.08,
    l: 0.5,
  };
}

export function scoreContextual(
  challenge: ContextualChallenge,
  input: ColorState,
  level: number,
  simulatePass: boolean | null,
): { passed: boolean; deltaE: number; accuracyRating: number } {
  const maxDe = getLevelConfig(level).maxDeltaE ?? 5;
  const result = calculatePerceptualScore(challenge.target, input, maxDe);
  if (simulatePass !== null) {
    return { passed: simulatePass, deltaE: result.deltaE, accuracyRating: result.accuracyRating };
  }
  return {
    passed: result.pass,
    deltaE: result.deltaE,
    accuracyRating: result.accuracyRating,
  };
}
