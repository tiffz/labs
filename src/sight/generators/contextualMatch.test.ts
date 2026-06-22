import { describe, expect, it } from 'vitest';
import { FLAT_NEUTRAL_BACKGROUND, generateContextualMatchChallenge } from './contextualMatch';
import { initialContextualInput } from '../modules/contextualMatcher/contextualMatcherLogic';

describe('generateContextualMatchChallenge', () => {
  it('level 12 uses adjacent flat display with lightness offset', () => {
    const c = generateContextualMatchChallenge(42, 12);
    expect(c.display).toBe('adjacent');
    expect(c.background).toEqual(FLAT_NEUTRAL_BACKGROUND);
    expect(c.locked).toEqual({ lightness: false, chroma: true, hue: true });
    expect(c.startLightnessDelta).toBeDefined();
    expect(Math.abs(c.startLightnessDelta!)).toBeGreaterThanOrEqual(0.12);
    const input = initialContextualInput(c);
    expect(Math.abs(input.l - c.target.l)).toBeGreaterThanOrEqual(0.12);
  });

  it('level 13 uses flat neutral display', () => {
    const c = generateContextualMatchChallenge(42, 13);
    expect(c.display).toBe('flat');
    expect(c.background).toEqual(FLAT_NEUTRAL_BACKGROUND);
    expect(c.locked).toEqual({ lightness: false, chroma: true, hue: true });
  });

  it('level 14 uses contextual complement background for value only', () => {
    const c = generateContextualMatchChallenge(42, 14);
    expect(c.display).toBe('contextual');
    expect(c.locked).toEqual({ lightness: false, chroma: true, hue: true });
    const hueDelta = Math.abs(c.background.h - c.target.h);
    const circular = Math.min(hueDelta, 360 - hueDelta);
    expect(circular).toBeGreaterThan(170);
    expect(circular).toBeLessThan(190);
  });

  it('level 15 locks lightness and starts chroma offset', () => {
    const c = generateContextualMatchChallenge(42, 15);
    expect(c.locked).toEqual({ lightness: true, chroma: false, hue: true });
    expect(c.startChromaDelta).toBeDefined();
    const input = initialContextualInput(c);
    expect(input.l).toBeCloseTo(c.target.l, 2);
    expect(input.h).toBeCloseTo(c.target.h, 0);
    expect(Math.abs(input.c - c.target.c)).toBeGreaterThanOrEqual(0.06);
  });

  it('level 16 unlocks lightness and chroma together', () => {
    const c = generateContextualMatchChallenge(42, 16);
    expect(c.locked).toEqual({ lightness: false, chroma: false, hue: true });
  });

  it('level 17 locks lightness and chroma for hue-only matching', () => {
    const c = generateContextualMatchChallenge(42, 17);
    expect(c.locked).toEqual({ lightness: true, chroma: true, hue: false });
    expect(c.startHueDelta).toBeDefined();
    const input = initialContextualInput(c);
    expect(input.l).toBeCloseTo(c.target.l, 2);
    expect(input.c).toBeCloseTo(c.target.c, 2);
    expect(Math.abs(input.h - c.target.h)).toBeGreaterThanOrEqual(20);
  });
});
