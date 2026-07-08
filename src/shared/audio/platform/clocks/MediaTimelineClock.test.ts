import { describe, expect, it } from 'vitest';
import { MediaTimelineClock } from './MediaTimelineClock';

describe('MediaTimelineClock invalid bpm guards', () => {
  it('does not throw when bpm is zero', () => {
    const clock = new MediaTimelineClock({
      bpm: 0,
      timeSignature: { numerator: 4, denominator: 4 },
      anchorMediaTime: 0,
      getMediaTime: () => 10,
    });
    expect(clock.mediaTimeToBeatIndex(10)).toBe(0);
    expect(clock.beatIndexToMediaTime(3)).toBe(0);
  });
});
