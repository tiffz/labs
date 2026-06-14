import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  edgeInsetPx,
  parseCssColorToRgb,
  relativeLuminance,
} from './layoutHeuristicsCore';

describe('layoutHeuristicsCore', () => {
  it('parses hex and rgb colors', () => {
    expect(parseCssColorToRgb('#2f332c')).toEqual([47, 51, 44]);
    expect(parseCssColorToRgb('#fff')).toEqual([255, 255, 255]);
    expect(parseCssColorToRgb('rgb(111, 108, 101)')).toEqual([111, 108, 101]);
  });

  it('computes WCAG contrast for gesture ink on linen canvas', () => {
    const ink = parseCssColorToRgb('#2f332c')!;
    const canvas = parseCssColorToRgb('#e8e4dc')!;
    expect(contrastRatio(ink, canvas)).toBeGreaterThan(4.5);
  });

  it('gesture muted lede meets smoke floor on canvas', () => {
    const muted = parseCssColorToRgb('#6f6c65')!;
    const canvas = parseCssColorToRgb('#e8e4dc')!;
    expect(contrastRatio(muted, canvas)).toBeGreaterThanOrEqual(4);
  });

  it('flags low-contrast pair', () => {
    const fg = parseCssColorToRgb('#cccccc')!;
    const bg = parseCssColorToRgb('#dddddd')!;
    expect(contrastRatio(fg, bg)).toBeLessThan(4.5);
  });

  it('measures edge inset', () => {
    const inset = edgeInsetPx(
      { left: 20, right: 380, top: 40, bottom: 200 },
      { left: 0, right: 400, top: 0, bottom: 240 },
    );
    expect(inset.left).toBe(20);
    expect(inset.right).toBe(20);
    expect(inset.top).toBe(40);
    expect(inset.bottom).toBe(40);
  });

  it('relative luminance is ordered for black vs white', () => {
    expect(relativeLuminance(0, 0, 0)).toBeLessThan(relativeLuminance(255, 255, 255));
  });
});
