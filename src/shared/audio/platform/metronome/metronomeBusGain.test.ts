import { describe, expect, it } from 'vitest';
import { defaultMetronomePreferences } from './preferences';
import { applyMetronomeBusGain } from './metronomeBusGain';

describe('applyMetronomeBusGain', () => {
  it('scales advanced Overall volume by the app mix bus gain', () => {
    const base = defaultMetronomePreferences({ numerator: 4, denominator: 4 }, {
      masterVolume: 100,
    });
    expect(applyMetronomeBusGain(base, 0.5).masterVolume).toBe(50);
    expect(applyMetronomeBusGain(base, 1).masterVolume).toBe(100);
  });

  it('combines bus gain with a trimmed Overall slider', () => {
    const base = defaultMetronomePreferences({ numerator: 4, denominator: 4 }, {
      masterVolume: 60,
    });
    expect(applyMetronomeBusGain(base, 0.5).masterVolume).toBe(30);
  });
});
