import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PALETTE_PROFILE,
  PALETTE_MOOD_PRESETS,
  colorStateToHex,
  extractColorsByMethod,
  generatePaletteFromSeedHex,
  generateRandomPalettes,
  hexToColorState,
  hueDistance,
  proposePalettesFromPixels,
  type ColorState,
} from './index';

function syntheticPixels(): ColorState[] {
  const out: ColorState[] = [];
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      out.push({
        h: (x * 17 + y * 11) % 360,
        c: 0.06 + ((x * 13 + y * 7) % 20) / 100,
        l: 0.25 + ((x + y) % 16) / 32,
      });
    }
  }
  return out;
}

describe('palette extraction strategies', () => {
  it('vivid picks higher chroma than centroid alone', () => {
    const pixels = syntheticPixels();
    const vivid = extractColorsByMethod(pixels, 'vivid', 5);
    const centroid = extractColorsByMethod(pixels, 'centroid', 5);
    const vividChroma = vivid.reduce((sum, c) => sum + c.c, 0) / vivid.length;
    const centroidChroma = centroid.reduce((sum, c) => sum + c.c, 0) / centroid.length;
    expect(vividChroma).toBeGreaterThanOrEqual(centroidChroma * 0.9);
  });

  it('produces one faithful palette per extraction method', () => {
    const proposals = proposePalettesFromPixels(syntheticPixels(), {
      profile: DEFAULT_PALETTE_PROFILE,
      methods: ['vivid', 'extremes'],
      maxSwatches: 5,
    });
    expect(proposals).toHaveLength(2);
    expect(proposals.map((p) => p.id)).toEqual(['vivid', 'extremes']);
    expect(proposals[0]?.colors.length).toBe(5);
  });
});

describe('random palette generation', () => {
  it('generates deterministic palettes with a fixed seed', () => {
    const a = generateRandomPalettes(PALETTE_MOOD_PRESETS.pastel, { count: 3, seed: 42 });
    const b = generateRandomPalettes(PALETTE_MOOD_PRESETS.pastel, { count: 3, seed: 42 });
    expect(a.map((row) => row.id)).toEqual(b.map((row) => row.id));
    expect(a[0]?.colors.length).toBeGreaterThan(2);
  });

  it('respects pastel lightness bounds', () => {
    const rows = generateRandomPalettes(PALETTE_MOOD_PRESETS.pastel, { count: 2, seed: 7 });
    for (const color of rows.flatMap((row) => row.colors)) {
      expect(color.l).toBeGreaterThanOrEqual(0.75);
      expect(color.l).toBeLessThanOrEqual(0.95);
    }
  });

  it('varies seed harmonies when a variation seed is provided', () => {
    const base = generatePaletteFromSeedHex('#3366cc', PALETTE_MOOD_PRESETS.vivid, 5);
    const varied = generatePaletteFromSeedHex('#3366cc', PALETTE_MOOD_PRESETS.vivid, 5, { variationSeed: 42 });
    const variedAgain = generatePaletteFromSeedHex('#3366cc', PALETTE_MOOD_PRESETS.vivid, 5, {
      variationSeed: 99,
    });
    expect(varied.length).toBeGreaterThan(0);
    const serialize = (rows: typeof base): string =>
      rows.map((row) => row.colors.map(colorStateToHex).join(',')).join('|');
    expect(serialize(varied)).not.toBe(serialize(base));
    expect(serialize(variedAgain)).not.toBe(serialize(varied));

    let changedRows = 0;
    for (let i = 0; i < Math.min(base.length, varied.length); i++) {
      const baseRow = serialize([base[i]!]);
      const variedRow = serialize([varied[i]!]);
      if (baseRow !== variedRow) changedRows++;
    }
    expect(changedRows).toBeGreaterThanOrEqual(2);
  });

  it('mixed mood batches vary mood and hue while staying loosely related', () => {
    const rows = generateRandomPalettes(PALETTE_MOOD_PRESETS.mixed, { count: 8, seed: 99 });
    const uniquePalettes = new Set(rows.map((row) => row.colors.map(colorStateToHex).join(',')));
    expect(uniquePalettes.size).toBeGreaterThanOrEqual(5);

    const hues = rows.map((row) => row.colors[0]?.h ?? 0);
    let sin = 0;
    let cos = 0;
    for (const hue of hues) {
      const rad = (hue * Math.PI) / 180;
      sin += Math.sin(rad);
      cos += Math.cos(rad);
    }
    const meanHue = ((Math.atan2(sin / hues.length, cos / hues.length) * 180) / Math.PI + 360) % 360;
    const maxDistance = Math.max(...hues.map((hue) => hueDistance(hue, meanHue)));
    expect(maxDistance).toBeGreaterThan(28);
    expect(hues.filter((hue) => hueDistance(hue, meanHue) < 60).length).toBeGreaterThanOrEqual(3);
  });

  it('seed palettes keep the anchor lightness near the seed color', () => {
    const seedHex = '#f6b87b';
    const seed = hexToColorState(seedHex);
    expect(seed).not.toBeNull();
    const rows = generatePaletteFromSeedHex(seedHex, PALETTE_MOOD_PRESETS.mixed, 5);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const anchor = row.colors[0];
      expect(anchor).toBeDefined();
      expect(Math.abs(anchor!.l - seed!.l)).toBeLessThan(0.18);
      expect(hueDistance(anchor!.h, seed!.h)).toBeLessThan(24);
    }
  });

  it('neonInk palettes use tinted luminosity extremes and a vivid accent', () => {
    const rows = generateRandomPalettes(PALETTE_MOOD_PRESETS.neonInk, { count: 3, seed: 12, swatches: 5 });
    for (const row of rows) {
      const hexes = row.colors.map(colorStateToHex);
      expect(hexes.some((hex) => hex.toLowerCase() === '#000000')).toBe(false);
      expect(hexes.some((hex) => hex.toLowerCase() === '#ffffff')).toBe(false);

      const inks = row.colors.filter((color) => color.l <= 0.12);
      const papers = row.colors.filter((color) => color.l >= 0.92);
      expect(inks.length).toBeGreaterThan(0);
      expect(papers.length).toBeGreaterThan(0);
      expect(inks.every((color) => color.c >= 0.035)).toBe(true);
      expect(papers.every((color) => color.c >= 0.025)).toBe(true);
      expect(row.colors.some((color) => color.c >= 0.26)).toBe(true);
    }
  });

  it('image variation seed changes extracted palettes from the same pixels', () => {
    const pixels = syntheticPixels();
    const base = proposePalettesFromPixels(pixels, { maxSwatches: 5 });
    const varied = proposePalettesFromPixels(pixels, { maxSwatches: 5, variationSeed: 29 });
    expect(base.length).toBeGreaterThan(0);
    expect(varied.length).toBeGreaterThan(0);
    const baseHex = base[0]?.colors.map(colorStateToHex).join(',');
    const variedHex = varied[0]?.colors.map(colorStateToHex).join(',');
    expect(variedHex).not.toBe(baseHex);
  });
  it('contrast palettes use tinted ink and paper with a saturated mid accent', () => {
    const rows = generateRandomPalettes(PALETTE_MOOD_PRESETS.contrast, { count: 3, seed: 44, swatches: 5 });
    for (const row of rows) {
      const hexes = row.colors.map(colorStateToHex);
      expect(hexes.some((hex) => hex.toLowerCase() === '#000000')).toBe(false);
      expect(hexes.some((hex) => hex.toLowerCase() === '#ffffff')).toBe(false);

      expect(row.colors.some((color) => color.l <= 0.12)).toBe(true);
      expect(row.colors.some((color) => color.l >= 0.9)).toBe(true);
      expect(row.colors.some((color) => color.c >= 0.12 && color.l >= 0.33 && color.l <= 0.66)).toBe(true);
    }
  });
});
