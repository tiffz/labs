import { describe, it, expect } from 'vitest';
import { CatPositionServiceNew } from '../services/CatPositionServiceNew';
import { catCoordinateSystem } from '../services/CatCoordinateSystem';

describe('Dev move NaN guard', () => {
  it('clamps extreme inputs and never produces NaN world coordinates', () => {
    const svc = new CatPositionServiceNew();
    // Extreme target outside any reasonable bounds
    svc.setPosition({ x: Number.POSITIVE_INFINITY, y: -99999, z: Number.NaN as unknown as number });
    const { worldCoordinates } = svc.getRenderData();
    expect(Number.isNaN(worldCoordinates.x)).toBe(false);
    expect(Number.isNaN(worldCoordinates.y)).toBe(false);
    expect(Number.isNaN(worldCoordinates.z)).toBe(false);
    // And within world bounds
    const dims = catCoordinateSystem.getWorldDimensions();
    expect(worldCoordinates.x).toBeGreaterThanOrEqual(0);
    expect(worldCoordinates.x).toBeLessThanOrEqual(dims.width);
    expect(worldCoordinates.y).toBeGreaterThanOrEqual(0);
    expect(worldCoordinates.y).toBeLessThanOrEqual(dims.height);
    expect(worldCoordinates.z).toBeGreaterThanOrEqual(dims.wallDepth);
    expect(worldCoordinates.z).toBeLessThanOrEqual(dims.depth);
  });
});

