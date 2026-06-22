import { getLevelConfig } from '../../levels';
import { calculatePerceptualScore, clampColorState } from '../../scoring/perceptualScore';
import type { ColorState, ContextualChallenge } from '../../types';

export function initialContextualInput(challenge: ContextualChallenge): ColorState {
  const { target, locked } = challenge;

  if (challenge.display === 'adjacent' && challenge.startLightnessDelta !== undefined) {
    return clampColorState({
      h: locked.hue ? target.h : 0,
      c: locked.chroma ? target.c : 0.08,
      l: target.l + challenge.startLightnessDelta,
    });
  }

  if (challenge.startChromaDelta !== undefined) {
    return clampColorState({
      h: target.h,
      l: target.l,
      c: target.c + challenge.startChromaDelta,
    });
  }

  if (challenge.startHueDelta !== undefined) {
    return clampColorState({
      h: (target.h + challenge.startHueDelta + 360) % 360,
      l: target.l,
      c: target.c,
    });
  }

  return clampColorState({
    h: locked.hue ? target.h : 0,
    c: locked.chroma ? target.c : 0.08,
    l: locked.lightness ? target.l : 0.5,
  });
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
