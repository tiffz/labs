import type { ColorState, PracticeReveal, SightChallenge } from '../types';

function isWarmHue(h: number): boolean {
  const x = ((h % 360) + 360) % 360;
  return x >= 15 && x <= 75;
}

export function tagsForChallenge(challenge: SightChallenge): string[] {
  const tags: string[] = [`kind:${challenge.kind}`];
  if (challenge.kind === 'flashcard-isolated') {
    tags.push(`axis:${challenge.axis}`, `profile:${challenge.profile}`);
  }
  if (challenge.kind === 'flashcard-albers') {
    tags.push(`question:${challenge.question}`, `profile:${challenge.profile}`);
    if (isWarmHue(challenge.left.background.h) || isWarmHue(challenge.right.background.h)) {
      tags.push('warm-bg');
    }
    if (challenge.left.background.c > 0.14 || challenge.right.background.c > 0.14) {
      tags.push('saturated-bg');
    }
  }
  if (challenge.kind === 'contextual') {
    tags.push(`display:${challenge.display}`);
    if (isWarmHue(challenge.background.h)) tags.push('warm-bg');
  }
  if (challenge.kind === 'munsell-slice') {
    tags.push(`slice:${challenge.axis}`);
  }
  if (challenge.kind === 'albers-equalizer') {
    tags.push(`pair:${challenge.backgroundPair}`);
    if (isWarmHue(challenge.left.background.h)) tags.push('warm-bg');
  }
  if (challenge.kind === 'yot-cast') {
    tags.push(`light:${challenge.lightPrompt}`);
  }
  if (challenge.kind === 'anchor-pivot') {
    tags.push(`harmony:${challenge.system}`);
  }
  return tags;
}

export function telemetryFromReveal(
  reveal: PracticeReveal,
  challenge: SightChallenge,
): { deltaE?: number; accuracyRating?: number; overlapPct?: number } {
  if (reveal.kind === 'contextual') {
    return { deltaE: reveal.deltaE, accuracyRating: reveal.accuracyRating };
  }
  if (reveal.kind === 'bridge') {
    return { accuracyRating: reveal.closenessPct };
  }
  if (reveal.kind === 'gamut') {
    return { overlapPct: reveal.overlapPct, accuracyRating: reveal.overlapPct };
  }
  if (reveal.kind === 'flashcard-isolated' && challenge.kind === 'flashcard-isolated') {
    const picked = reveal.pickedSide === 'left' ? challenge.left : challenge.right;
    const correct =
      challenge.correctSide === 'left' ? challenge.left : challenge.right;
    return { deltaE: axisDeltaE(picked, correct, challenge.axis) };
  }
  if (reveal.kind === 'albers-equalizer') {
    return { deltaE: reveal.deltaE, accuracyRating: reveal.accuracyRating };
  }
  if (reveal.kind === 'anchor-pivot') {
    return { accuracyRating: reveal.angularScore };
  }
  return {};
}

function axisDeltaE(a: ColorState, b: ColorState, axis: string): number {
  if (axis === 'lighter' || axis === 'darker') return Math.abs(a.l - b.l) * 100;
  if (axis === 'moreSaturated' || axis === 'lessSaturated') return Math.abs(a.c - b.c) * 100;
  if (axis === 'warmer' || axis === 'cooler') {
    return Math.abs(((a.h - b.h + 540) % 360) - 180);
  }
  return Math.abs(a.l - b.l) * 50 + Math.abs(a.c - b.c) * 50;
}
