import { describe, expect, it } from 'vitest';

import { colorsFromHarmony } from './harmony';

describe('colorsFromHarmony', () => {
  it('returns five colors for analogous harmony', () => {
    const colors = colorsFromHarmony({ h: 200, c: 0.18, l: 0.55 }, 'analogous', 5);
    expect(colors).toHaveLength(5);
  });
});
