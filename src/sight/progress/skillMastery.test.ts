import { describe, expect, it } from 'vitest';
import { countMasteredSkills, scoreToMasteryLevel } from './skillMastery';
import { defaultSkillMatrix } from './types';

describe('scoreToMasteryLevel', () => {
  it('maps low scores to 1–2 stars', () => {
    expect(scoreToMasteryLevel(30)).toBe(1);
    expect(scoreToMasteryLevel(50)).toBe(2);
  });

  it('maps mid and high scores to 3–4 stars', () => {
    expect(scoreToMasteryLevel(65)).toBe(3);
    expect(scoreToMasteryLevel(85)).toBe(4);
  });
});

describe('countMasteredSkills', () => {
  it('counts only 4★ skills as mastered', () => {
    const matrix = {
      ...defaultSkillMatrix(1),
      valueSensation: 85,
      chromaIsolation: 50,
    };
    expect(countMasteredSkills(matrix)).toBe(1);
  });
});
