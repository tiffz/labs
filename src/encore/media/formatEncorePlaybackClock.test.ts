import { describe, expect, it } from 'vitest';
import { formatEncorePlaybackClock } from './formatEncorePlaybackClock';

describe('formatEncorePlaybackClock', () => {
  it('formats seconds as m:ss', () => {
    expect(formatEncorePlaybackClock(0)).toBe('0:00');
    expect(formatEncorePlaybackClock(65)).toBe('1:05');
  });

  it('handles invalid values', () => {
    expect(formatEncorePlaybackClock(Number.NaN)).toBe('0:00');
    expect(formatEncorePlaybackClock(-1)).toBe('0:00');
  });
});
