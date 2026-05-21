import { describe, expect, it } from 'vitest';
import { FLAT_NEUTRAL_BACKGROUND, generateContextualMatchChallenge } from './contextualMatch';

describe('generateContextualMatchChallenge', () => {
  it('level 5 uses flat neutral display', () => {
    const c = generateContextualMatchChallenge(42, 5);
    expect(c.display).toBe('flat');
    expect(c.background).toEqual(FLAT_NEUTRAL_BACKGROUND);
    expect(c.locked.hue).toBe(true);
    expect(c.locked.chroma).toBe(true);
  });

  it('level 6 uses contextual complement background', () => {
    const c = generateContextualMatchChallenge(42, 6);
    expect(c.display).toBe('contextual');
    const hueDelta = Math.abs(c.background.h - c.target.h);
    const circular = Math.min(hueDelta, 360 - hueDelta);
    expect(circular).toBeGreaterThan(170);
    expect(circular).toBeLessThan(190);
  });
});
