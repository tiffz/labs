import { describe, expect, it } from 'vitest';
import {
  getRandomPopularChordProgression,
  getRandomPopularChordProgressionInKey,
} from './randomChordProgression';

describe('getRandomPopularChordProgression', () => {
  it('formats a display progression using popular templates', () => {
    const values = [0, 0];
    let index = 0;
    const random = () => {
      const value = values[index] ?? 0;
      index += 1;
      return value;
    };

    const result = getRandomPopularChordProgression(random);

    expect(result.key).toBe('C');
    expect(result.progressionName).toBe('I–V–vi–IV');
    expect(result.chordSymbols).toEqual(['C', 'G', 'Am', 'F']);
    expect(result.display).toBe('C – G – Am – F');
  });

  it('randomizes progression within selected key', () => {
    const result = getRandomPopularChordProgressionInKey('D', () => 0);
    expect(result.key).toBe('D');
    expect(result.chordSymbols).toEqual(['D', 'A', 'Bm', 'G']);
    expect(result.display).toBe('D – A – Bm – G');
  });
});
