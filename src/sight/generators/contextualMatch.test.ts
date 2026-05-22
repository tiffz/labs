import { describe, expect, it } from 'vitest';
import { FLAT_NEUTRAL_BACKGROUND, generateContextualMatchChallenge } from './contextualMatch';
import { initialContextualInput } from '../modules/contextualMatcher/contextualMatcherLogic';

describe('generateContextualMatchChallenge', () => {
  it('level 12 uses adjacent flat display with lightness offset', () => {
    const c = generateContextualMatchChallenge(42, 12);
    expect(c.display).toBe('adjacent');
    expect(c.background).toEqual(FLAT_NEUTRAL_BACKGROUND);
    expect(c.locked.hue).toBe(true);
    expect(c.locked.chroma).toBe(true);
    expect(c.startLightnessDelta).toBeDefined();
    expect(Math.abs(c.startLightnessDelta!)).toBeGreaterThanOrEqual(0.12);
    const input = initialContextualInput(c);
    expect(Math.abs(input.l - c.target.l)).toBeGreaterThanOrEqual(0.12);
  });

  it('level 13 uses flat neutral display', () => {
    const c = generateContextualMatchChallenge(42, 13);
    expect(c.display).toBe('flat');
    expect(c.background).toEqual(FLAT_NEUTRAL_BACKGROUND);
    expect(c.locked.hue).toBe(true);
    expect(c.locked.chroma).toBe(true);
  });

  it('level 14 uses contextual complement background', () => {
    const c = generateContextualMatchChallenge(42, 14);
    expect(c.display).toBe('contextual');
    const hueDelta = Math.abs(c.background.h - c.target.h);
    const circular = Math.min(hueDelta, 360 - hueDelta);
    expect(circular).toBeGreaterThan(170);
    expect(circular).toBeLessThan(190);
  });
});
