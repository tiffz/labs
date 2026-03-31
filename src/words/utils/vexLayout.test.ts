import { describe, expect, it } from 'vitest';
import { computeMaxLineWidth, wrapMeasureIndexes } from './vexLayout';

describe('vexLayout', () => {
  it('computes a bounded max line width from viewport and zoom', () => {
    const maxLineWidth = computeMaxLineWidth(840, 1.5, 16, 24, 24);
    expect(maxLineWidth).toBeGreaterThan(180);
    expect(maxLineWidth).toBeLessThan(600);
  });

  it('wraps measure indices when cumulative width exceeds line width', () => {
    const lines = wrapMeasureIndexes([220, 230, 210, 200], 500);
    expect(lines).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it('keeps all measures on one line when there is enough room', () => {
    const lines = wrapMeasureIndexes([140, 150, 160], 1000);
    expect(lines).toEqual([[0, 1, 2]]);
  });
});

