import { describe, expect, it } from 'vitest';
import {
  FREE_PRACTICE_MAJOR_KEYS,
  FREE_PRACTICE_MINOR_KEYS,
  keyForKindOrDefault,
  keysForKind,
} from './freePracticeOptions';
import type { Key } from '../curriculum/types';

// Pitch class (0-11) for every key spelling used by the pickers.
const PC: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

describe('circle-of-fifths key ordering', () => {
  const isPerfectFifthRing = (keys: readonly Key[]) =>
    keys.every((k, i) => {
      const next = keys[(i + 1) % keys.length]!;
      return (PC[next]! - PC[k]! + 12) % 12 === 7; // each step is up a fifth
    });

  it('the major key list is a true circle of fifths', () => {
    expect(FREE_PRACTICE_MAJOR_KEYS).toHaveLength(12);
    expect(isPerfectFifthRing(FREE_PRACTICE_MAJOR_KEYS)).toBe(true);
  });

  it('the minor key list is a true circle of fifths (regression: flat arm was reversed)', () => {
    expect(FREE_PRACTICE_MINOR_KEYS).toHaveLength(12);
    expect(isPerfectFifthRing(FREE_PRACTICE_MINOR_KEYS)).toBe(true);
  });
});

describe('keyForKindOrDefault', () => {
  it('keeps a key the new family supports', () => {
    expect(keyForKindOrDefault('major-scale', 'Bb')).toBe('Bb');
    expect(keyForKindOrDefault('natural-minor-scale', 'C#')).toBe('C#');
  });

  it('falls back to the first key when the current one is not offered by the family', () => {
    // C# is a minor-family key but not a major-family key.
    expect(keysForKind('natural-minor-scale')).toContain('C#');
    expect(keysForKind('major-scale')).not.toContain('C#');
    expect(keyForKindOrDefault('major-scale', 'C#')).toBe(keysForKind('major-scale')[0]);
  });
});
