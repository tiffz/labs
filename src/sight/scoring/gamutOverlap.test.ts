import { describe, expect, it } from 'vitest';
import {
  deformMask,
  findBestGamutDeform,
  gamutOverlapPct,
  pointInPolygon,
} from './gamutOverlap';

describe('gamutOverlap', () => {
  it('handles polygons that cross the hue wrap', () => {
    const poly = [
      { h: 350, c: 0.1 },
      { h: 10, c: 0.12 },
      { h: 5, c: 0.05 },
    ];
    expect(pointInPolygon({ h: 0, c: 0.08 }, poly)).toBe(true);
    expect(pointInPolygon({ h: 200, c: 0.08 }, poly)).toBe(false);
  });

  it('reaches high coverage when the user mask is aligned', () => {
    const truth = [
      { h: 220, c: 0.1 },
      { h: 260, c: 0.14 },
      { h: 200, c: 0.06 },
    ];
    const samples = [
      { h: 226, c: 0.1 },
      { h: 227, c: 0.1 },
      { h: 225, c: 0.1 },
    ];
    const best = findBestGamutDeform(truth, samples);
    expect(best.overlapPct).toBeGreaterThanOrEqual(80);
    const aligned = deformMask(truth, { h: 0, c: 0, scale: 1 });
    expect(gamutOverlapPct(truth, aligned, samples)).toBeGreaterThanOrEqual(80);
  });
});
