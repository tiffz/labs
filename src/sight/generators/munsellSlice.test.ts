import { describe, expect, it } from 'vitest';
import { generateMunsellSliceChallenge } from './munsellSlice';

describe('munsellSlice generator', () => {
  it('marks exactly one outlier', () => {
    const c = generateMunsellSliceChallenge(42, 25);
    expect(c.swatches).toHaveLength(5);
    expect(c.outlierIndex).toBeGreaterThanOrEqual(0);
    expect(c.outlierIndex).toBeLessThan(5);
  });
});
