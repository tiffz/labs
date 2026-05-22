import { describe, expect, it } from 'vitest';
import { generateIsolatedFlashcardChallenge } from './isolatedFlashcard';
import { temperatureIndex } from '../scoring/temperature';

describe('generateIsolatedFlashcardChallenge', () => {
  it('level 1 uses grayscale value axes', () => {
    const c = generateIsolatedFlashcardChallenge(1, 1);
    expect(c.profile).toBe('valueGrayscale');
    expect(c.left.c).toBeLessThan(0.05);
    expect(['lighter', 'darker']).toContain(c.axis);
  });

  it('level 7 uses temperature axis with distinct warm/cool index', () => {
    const c = generateIsolatedFlashcardChallenge(77, 7);
    expect(c.profile).toBe('temperatureHueBoundary');
    expect(['warmer', 'cooler']).toContain(c.axis);
    const li = temperatureIndex(c.left);
    const ri = temperatureIndex(c.right);
    expect(Math.sign(li - ri)).not.toBe(0);
  });
});
