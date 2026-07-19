import { describe, expect, it } from 'vitest';
import { clampColorState, formatOklchChannels, formatOklchCss } from './formatOklch';

describe('formatOklch', () => {
  it('formats CSS oklch() with percent lightness', () => {
    expect(formatOklchCss({ l: 0.55, c: 0.12, h: 220 })).toBe('oklch(55.0% 0.120 220.0)');
  });

  it('formats channel breakdown', () => {
    const ch = formatOklchChannels({ l: 0.4, c: 0.06, h: 15 });
    expect(ch.l).toBe('40.0%');
    expect(ch.c).toBe('0.060');
    expect(ch.h).toBe('15.0°');
    expect(ch.css).toBe('oklch(40.0% 0.060 15.0)');
  });

  it('clamps out-of-range channels', () => {
    expect(clampColorState({ h: -30, c: 0.9, l: 1.4 })).toEqual({ h: 330, c: 0.4, l: 1 });
  });
});
