import { describe, expect, it } from 'vitest';
import { matchesChord } from './chordMatcher';

describe('matchesChord', () => {
  it('does not match a different triad quality/root', () => {
    // G major should not satisfy C major.
    expect(matchesChord([55, 59, 62], 'C')).toBe(false);
  });

  it('matches the same chord across octaves and inversions', () => {
    // C major with duplicated tones in multiple octaves.
    expect(matchesChord([36, 52, 55, 60, 64, 67, 72], 'C')).toBe(true);
    // First inversion voicing.
    expect(matchesChord([64, 67, 72], 'C')).toBe(true);
  });
});
