import { describe, expect, it } from 'vitest';
import { resolvePracticeSourceSwitchSeek } from './stanzaPracticeSourceSwitch';

describe('resolvePracticeSourceSwitchSeek', () => {
  it('clamps to destination duration when known', () => {
    expect(
      resolvePracticeSourceSwitchSeek({
        previousTime: 95,
        destinationDurationSec: 80,
        timeEps: 0.02,
      }),
    ).toBeCloseTo(80 - 0.01);
  });

  it('keeps time when destination duration is unknown', () => {
    expect(
      resolvePracticeSourceSwitchSeek({
        previousTime: 42,
        destinationDurationSec: null,
        timeEps: 0.02,
      }),
    ).toBe(42);
  });

  it('floors negative times', () => {
    expect(
      resolvePracticeSourceSwitchSeek({
        previousTime: -3,
        destinationDurationSec: 100,
        timeEps: 0.02,
      }),
    ).toBe(0);
  });
});
