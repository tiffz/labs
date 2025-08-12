import { describe, it, expect } from 'vitest';
import { catCoordinateSystem, type CatCoordinates } from '../services/CatCoordinateSystem';
import { computeShadowLayout } from '../services/ShadowLayout';

describe('WorldProjectionConsistency', () => {
  it('shadow aligns with ground projection at resting height across multiple Z values', () => {
    const zs = [120, 240, 360, 480, 580];
    zs.forEach((z) => {
      const coords: CatCoordinates = { x: 600, y: 0, z };
      const screen = catCoordinateSystem.catToScreen(coords);
      const shadow = catCoordinateSystem.getShadowPosition(coords);
      expect(Math.abs(screen.x - shadow.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(screen.y - shadow.y)).toBeLessThanOrEqual(2);
    });
  });

  it('feet baseline equals shadow vertical center at rest across multiple Z values', () => {
    const zs = [0 + 1, 240, 480, 720, 960, 1199];
    zs.forEach((z) => {
      const coords: CatCoordinates = { x: 600, y: 0, z };
      const cat = catCoordinateSystem.catToScreen(coords);
      const shadow = computeShadowLayout(cat);
      const shadowCenter = shadow.bottom + shadow.height / 2;
      // feet baseline = cat.y when y=0
      expect(Math.abs(cat.y - shadowCenter)).toBeLessThanOrEqual(1);
    });
  });

  it('cat-bottom minus shadow stays within tolerance when jumping', () => {
    const coordsGround: CatCoordinates = { x: 600, y: 0, z: 360 };
    const coordsJump: CatCoordinates = { x: 600, y: 100, z: 360 };
    const ground = catCoordinateSystem.catToScreen(coordsGround);
    const shadowAtJump = catCoordinateSystem.getShadowPosition(coordsJump);
    // Shadow should remain at the ground baseline; cat Y rises. Ensure a sane non-negative separation
    expect(shadowAtJump.y).toBeGreaterThanOrEqual(0);
    expect(ground.y - shadowAtJump.y).toBeLessThanOrEqual(4);
  });
});

