import { describe, expect, it } from 'vitest';

import {
  contrastRatio,
  ensureContrastHex,
  polishPaletteHexesForComicA11y,
  relativeLuminance,
} from './contrast';

describe('contrast', () => {
  it('computes WCAG contrast for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeGreaterThan(20);
    expect(relativeLuminance('#ffffff')).toBeGreaterThan(0.9);
    expect(relativeLuminance('#000000')).toBeLessThan(0.05);
  });

  it('darkens light ink until AA vs white', () => {
    const polished = ensureContrastHex('#cccccc', '#ffffff', 4.5);
    expect(contrastRatio(polished, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('polishes comic palettes so figure ink meets AA on balloons', () => {
    const next = polishPaletteHexesForComicA11y(['#e8e0d8', '#c4b5a0', '#8a7a66', '#ff6644', '#222222']);
    const darkest = [...next].sort(
      (a, b) => relativeLuminance(a) - relativeLuminance(b),
    )[0]!;
    expect(contrastRatio(darkest, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});
