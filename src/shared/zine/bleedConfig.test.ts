import { describe, expect, it } from 'vitest';

import {
  artworkDimensionsWithBleed,
  bleedForBinding,
  bleedOverlayPercents,
  DEFAULT_BLEED_CONFIG,
  DEFAULT_MIXAM_TRIM_PRESET,
  MIXAM_STANDARD_BLEED_IN,
} from './bleedConfig';

describe('bleedConfig', () => {
  it('defaults to Mixam 0.125" bleed and 0.25" quiet area', () => {
    expect(DEFAULT_BLEED_CONFIG.top).toBe(MIXAM_STANDARD_BLEED_IN);
    expect(DEFAULT_BLEED_CONFIG.quietArea).toBe(0.25);
  });

  it('computes digest bleed artwork size', () => {
    const artwork = artworkDimensionsWithBleed(
      { width: DEFAULT_MIXAM_TRIM_PRESET.width, height: DEFAULT_MIXAM_TRIM_PRESET.height, unit: 'in' },
      DEFAULT_BLEED_CONFIG,
    );
    expect(artwork.width).toBeCloseTo(5.75, 2);
    expect(artwork.height).toBeCloseTo(8.75, 2);
  });

  it('adds gutter for perfect binding', () => {
    const bleed = bleedForBinding('perfect');
    expect(bleed.gutter).toBe(0.5);
    const percents = bleedOverlayPercents(
      { width: 5.5, height: 8.5, unit: 'in' },
      bleed,
    );
    expect(percents.gutterWidthPercent).toBeGreaterThan(percents.quietAreaWidthPercent);
  });

  it('staple binding has no gutter', () => {
    expect(bleedForBinding('staple').gutter).toBeUndefined();
  });
});
