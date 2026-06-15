import { describe, expect, it } from 'vitest';
import { generateAlbersFlashcardChallenge } from './albersFlashcard';
import { calculatePerceptualScore } from '../scoring/perceptualScore';
import {
  inducedDeltaForQuestion,
  meetsMinimumInducedDelta,
  MIN_INDUCED_DELTAS,
} from '../scoring/chromaticInduction';

describe('generateAlbersFlashcardChallenge', () => {
  it('level 8 generates identity questions', () => {
    const c = generateAlbersFlashcardChallenge(99, 8);
    expect(c.kind).toBe('flashcard-albers');
    expect(c.question).toBe('identity');
    expect(c.correctBinary).not.toBeNull();
  });

  it('level 10 generates perceived temperature with identical targets', () => {
    const c = generateAlbersFlashcardChallenge(42, 10);
    expect(c.profile).toBe('perceivedTemperature');
    expect(c.targetsIdentical).toBe(true);
    expect(c.correctSide).not.toBeNull();
    const d = calculatePerceptualScore(c.left.target, c.right.target, 0.01);
    expect(d.deltaE).toBeLessThan(0.05);
  });

  it('perceived items meet minimum induced delta when possible', () => {
    for (const level of [9, 10, 11]) {
      for (let seed = 0; seed < 40; seed += 1) {
        const c = generateAlbersFlashcardChallenge(seed, level);
        if (c.question === 'identity') continue;
        expect(meetsMinimumInducedDelta(c.question, c.left, c.right)).toBe(true);
        const min = MIN_INDUCED_DELTAS[c.question as keyof typeof MIN_INDUCED_DELTAS];
        if (min !== undefined) {
          expect(inducedDeltaForQuestion(c.question, c.left, c.right)).toBeGreaterThanOrEqual(min);
        }
      }
    }
  });
});
