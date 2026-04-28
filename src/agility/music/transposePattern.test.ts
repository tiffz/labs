import { describe, expect, it } from 'vitest';
import { transposePatternIntoRange } from './transposePattern';

describe('transposePatternIntoRange', () => {
  it('shifts octave so pattern fits entirely inside comfort range', () => {
    const base = [60, 64, 67, 72];
    const out = transposePatternIntoRange(base, 55, 76, 2);
    expect(Math.min(...out)).toBeGreaterThanOrEqual(55 + 2);
    expect(Math.max(...out)).toBeLessThanOrEqual(76 - 2);
    expect(out.length).toBe(base.length);
    const sortedBase = [...base].sort((a, b) => a - b);
    const span = sortedBase[sortedBase.length - 1]! - sortedBase[0]!;
    const sortedOut = [...out].sort((a, b) => a - b);
    expect(sortedOut[sortedOut.length - 1]! - sortedOut[0]!).toBe(span);
  });
});
