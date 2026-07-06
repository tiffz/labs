import { describe, expect, it } from 'vitest';
import { positionInSixteenthsForGridIndex } from './metronomeGridPositions';

describe('positionInSixteenthsForGridIndex', () => {
  it('4/4 level 3: equal triplet spacing within each beat', () => {
    const ts = { numerator: 4, denominator: 4 };
    const positions = Array.from({ length: 12 }, (_, index) =>
      positionInSixteenthsForGridIndex(index, ts, 3),
    );
    expect(positions[0]).toBeCloseTo(0, 5);
    expect(positions[1]).toBeCloseTo(4 / 3, 5);
    expect(positions[2]).toBeCloseTo(8 / 3, 5);
    expect(positions[3]).toBeCloseTo(4, 5);
    expect(positions[4]).toBeCloseTo(4 + 4 / 3, 5);
    expect(positions[11]).toBeCloseTo(12 + 8 / 3, 5);
  });

  it('4/4 level 4: integer sixteenth grid', () => {
    const ts = { numerator: 4, denominator: 4 };
    const positions = Array.from({ length: 16 }, (_, index) =>
      positionInSixteenthsForGridIndex(index, ts, 4),
    );
    expect(positions).toEqual(Array.from({ length: 16 }, (_, i) => i));
  });

  it('4/4 level 2: eighth-note grid', () => {
    const ts = { numerator: 4, denominator: 4 };
    const positions = Array.from({ length: 8 }, (_, index) =>
      positionInSixteenthsForGridIndex(index, ts, 2),
    );
    expect(positions).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
  });
});
