import { describe, expect, it } from 'vitest';

import {
  normalizeSfxLoudness,
  sfxBaseFontSize,
  sfxLayoutBBox,
  sfxLoudnessFontScale,
  sfxRenderStyle,
} from './sfxLoudness';

describe('sfxLoudness', () => {
  it('normalizes missing loudness to normal', () => {
    expect(normalizeSfxLoudness(undefined)).toBe('normal');
    expect(normalizeSfxLoudness(null)).toBe('normal');
  });

  it('scales font size monotonically by loudness', () => {
    expect(sfxLoudnessFontScale('quiet')).toBeLessThan(sfxLoudnessFontScale('normal'));
    expect(sfxLoudnessFontScale('normal')).toBeLessThan(sfxLoudnessFontScale('loud'));
    const w = 200;
    expect(sfxBaseFontSize(w, 'quiet')).toBeLessThan(sfxBaseFontSize(w, 'normal'));
    expect(sfxBaseFontSize(w, 'normal')).toBeLessThan(sfxBaseFontSize(w, 'loud'));
  });

  it('enables burst + outline for loud SFX', () => {
    const loud = sfxRenderStyle('loud', 'THONK');
    expect(loud.burstTicks).toBe(true);
    expect(loud.outline).toBe(true);
    expect(Math.abs(loud.rotateDeg)).toBeGreaterThan(0);
    expect(sfxRenderStyle('quiet').burstTicks).toBe(false);
  });

  it('widens layout bbox for longer SFX strings', () => {
    const short = sfxLayoutBBox({ x: 100, y: 80, fontSize: 20, text: 'POW' });
    const long = sfxLayoutBBox({ x: 100, y: 80, fontSize: 20, text: 'FWOOSH' });
    expect(long.right - long.left).toBeGreaterThan(short.right - short.left);
  });
});
