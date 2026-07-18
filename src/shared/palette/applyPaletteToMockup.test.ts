import { describe, expect, it } from 'vitest';

import { hexToColorState } from '../color';
import { applyPaletteToMockup } from './applyPaletteToMockup';
import { createPaletteFromHexes } from './types';

describe('applyPaletteToMockup', () => {
  it('falls back to wireframe grays when there is no palette', () => {
    const result = applyPaletteToMockup(null, 3);
    expect(result.panelFills).toHaveLength(3);
    expect(result.panelFills.every((hex) => hex === '#f5f5f0')).toBe(true);
    expect(result.background).toBe('#ebe8e0');
    expect(result.bubble).toBe('#ffffff');
    expect(result.figure).toBe('#333333');
    expect(result.caption).toBe('#666666');
    expect(result.sfx).toBe('#222222');
    expect(result.sky).toBe('#dce9f5');
    expect(result.ground).toBe('#e8dcc8');
  });

  it('keeps page background and bubbles neutral while tinting sky/ground/figure', () => {
    const palette = createPaletteFromHexes(['#1a1a1a', '#ffe9f2', '#ff2d95', '#7c3aed', '#0ea5e9']);
    const result = applyPaletteToMockup(palette, 4);

    const lightnessOf = (hex: string): number => hexToColorState(hex)?.l ?? 0;
    const chromaOf = (hex: string): number => hexToColorState(hex)?.c ?? 0;
    const swatchLightness = palette.swatches.map((s) => lightnessOf(s.hex));

    expect(result.background).toBe('#ebe8e0');
    expect(result.bubble).toBe('#ffffff');
    expect(lightnessOf(result.figure)).toBeCloseTo(Math.min(...swatchLightness), 5);
    expect(lightnessOf(result.sky)).toBeGreaterThanOrEqual(0.75);
    expect(chromaOf(result.sky)).toBeLessThanOrEqual(0.12);
    expect(lightnessOf(result.ground)).toBeGreaterThanOrEqual(0.65);
    expect(result.panelFills.every((hex) => hex === result.sky)).toBe(true);
  });

  it('maps sfx to the highest-chroma swatch (may nudge L for paper contrast)', () => {
    const palette = createPaletteFromHexes(['#1a1a1a', '#ffe9f2', '#ff2d95', '#7c3aed', '#0ea5e9']);
    const result = applyPaletteToMockup(palette, 4);

    const chromaOf = (hex: string): number => hexToColorState(hex)?.c ?? 0;
    const swatchChroma = palette.swatches.map((s) => chromaOf(s.hex));
    // Luminosity may shift slightly for a11y vs paper; chroma should stay near the vivid pick.
    expect(chromaOf(result.sfx)).toBeGreaterThan(Math.max(...swatchChroma) - 0.02);
  });

  it('keeps the bubble pure white even for saturated palettes', () => {
    const palette = createPaletteFromHexes(['#7c3aed', '#ff2d95', '#0ea5e9']);
    const result = applyPaletteToMockup(palette, 2);
    expect(result.bubble).toBe('#ffffff');
  });
});
