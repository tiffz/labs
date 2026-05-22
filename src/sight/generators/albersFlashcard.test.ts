import { describe, expect, it } from 'vitest';
import { generateAlbersFlashcardChallenge } from './albersFlashcard';
import { calculatePerceptualScore } from '../scoring/perceptualScore';

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
});
