import { getLevelConfig } from '../levels';
import {
  perceivedLighterSide,
  perceivedMoreSaturatedSide,
  perceivedWarmerSide,
} from '../scoring/chromaticInduction';
import { clampColorState } from '../scoring/perceptualScore';
import type {
  AlbersFlashcardChallenge,
  AlbersProfile,
  AlbersQuestionKind,
  ColorState,
} from '../types';
import { createRng } from './rng';

function pickInRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function neutralTarget(rng: () => number): ColorState {
  return clampColorState({
    h: pickInRange(rng, 0, 360),
    c: pickInRange(rng, 0.04, 0.1),
    l: pickInRange(rng, 0.42, 0.58),
  });
}

/** Strong warm/cool fields for simultaneous contrast. */
function contrastingBackgrounds(rng: () => number): { warm: ColorState; cool: ColorState } {
  const warmHue = pickInRange(rng, 28, 55);
  const coolHue = pickInRange(rng, 210, 250);
  return {
    warm: clampColorState({
      h: warmHue,
      c: pickInRange(rng, 0.16, 0.3),
      l: pickInRange(rng, 0.48, 0.62),
    }),
    cool: clampColorState({
      h: coolHue,
      c: pickInRange(rng, 0.14, 0.28),
      l: pickInRange(rng, rng() < 0.5 ? 0.28 : 0.72, rng() < 0.5 ? 0.42 : 0.82),
    }),
  };
}

function questionsForProfile(profile: AlbersProfile): AlbersQuestionKind[] {
  switch (profile) {
    case 'identity':
      return ['identity'];
    case 'perceivedValue':
      return ['perceivedLighter', 'perceivedDarker'];
    case 'perceivedTemperature':
      return ['perceivedWarmer', 'perceivedCooler'];
    case 'perceivedChroma':
      return ['perceivedMoreSaturated', 'perceivedLessSaturated'];
  }
}

function correctForPerceived(
  question: AlbersQuestionKind,
  left: { target: ColorState; background: ColorState },
  right: { target: ColorState; background: ColorState },
): 'left' | 'right' {
  switch (question) {
    case 'perceivedLighter':
      return perceivedLighterSide(left, right);
    case 'perceivedDarker':
      return perceivedLighterSide(left, right) === 'left' ? 'right' : 'left';
    case 'perceivedWarmer':
      return perceivedWarmerSide(left, right);
    case 'perceivedCooler':
      return perceivedWarmerSide(left, right) === 'left' ? 'right' : 'left';
    case 'perceivedMoreSaturated':
      return perceivedMoreSaturatedSide(left, right);
    case 'perceivedLessSaturated':
      return perceivedMoreSaturatedSide(left, right) === 'left' ? 'right' : 'left';
    default:
      return 'left';
  }
}

export function albersPrompt(question: AlbersQuestionKind): string {
  switch (question) {
    case 'identity':
      return 'Are these inner targets mathematically identical?';
    case 'perceivedLighter':
      return 'Which inner target looks lighter?';
    case 'perceivedDarker':
      return 'Which inner target looks darker?';
    case 'perceivedWarmer':
      return 'Which inner target looks warmer?';
    case 'perceivedCooler':
      return 'Which inner target looks cooler?';
    case 'perceivedMoreSaturated':
      return 'Which inner target looks more saturated?';
    case 'perceivedLessSaturated':
      return 'Which inner target looks less saturated?';
  }
}

/**
 * Procedural Phase 2 generator — Albers identity + perceived diagnostics.
 * Answers are keyed to Oklch/Oklab induction math, not subjective taste.
 */
export function generateAlbersFlashcardChallenge(
  seed: number,
  level: number,
): AlbersFlashcardChallenge {
  const rng = createRng(seed);
  const profile = getLevelConfig(level).albersProfile ?? 'identity';
  const questions = questionsForProfile(profile);
  const question = questions[Math.floor(rng() * questions.length)]!;
  const { warm, cool } = contrastingBackgrounds(rng);
  const target = neutralTarget(rng);

  const warmField = { background: warm, target };
  const coolField = { background: cool, target };

  const swap = rng() < 0.5;
  const left = swap ? warmField : coolField;
  const right = swap ? coolField : warmField;

  if (question === 'identity') {
    const identical = rng() < 0.55;
    let rightTarget = target;
    if (!identical) {
      rightTarget = clampColorState({
        ...target,
        l: target.l + pickInRange(rng, 0.04, 0.08) * (rng() < 0.5 ? 1 : -1),
      });
    }
    return {
      kind: 'flashcard-albers',
      seed,
      profile,
      question,
      left,
      right: { ...right, target: rightTarget },
      targetsIdentical: identical,
      correctSide: null,
      correctBinary: identical ? 'same' : 'different',
    };
  }

  const correctSide = correctForPerceived(question, left, right);

  return {
    kind: 'flashcard-albers',
    seed,
    profile,
    question,
    left,
    right,
    targetsIdentical: true,
    correctSide,
    correctBinary: null,
  };
}
