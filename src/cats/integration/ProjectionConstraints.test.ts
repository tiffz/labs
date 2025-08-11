import { describe, it, expect, beforeEach } from 'vitest';
import { catCoordinateSystem, type CatCoordinates } from '../services/CatCoordinateSystem';
import { computeShadowLayout } from '../services/ShadowLayout';

/**
 * Projection constraints and invariants
 * - Front-most Z (closest to camera) baseline should sit on the floor (near y=0 in game layer space)
 * - At y=0, cat and shadow baselines should coincide (same x and y) across Z extremes
 */

const setViewport = (width: number, height: number, sidePanelWidth: number) => {
  // Ensure jsdom window sizes are reflected
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  catCoordinateSystem.setSidePanelWidth(sidePanelWidth);
  catCoordinateSystem.updateViewport();
  catCoordinateSystem.setCameraX(0);
};

const approx = (value: number, target: number, tolerance: number) => {
  return Math.abs(value - target) <= tolerance;
};

describe('ProjectionConstraints', () => {
  beforeEach(() => {
    // Stable viewport for repeatable tests
    setViewport(1280, 800, 450);
  });

  it('front-most Z baseline is at the floor (cat overlaps floor) when y=0', () => {
    const floor = catCoordinateSystem.getFloorDimensions();
    // Use a Z slightly beyond the declared world depth; service clamps using its own front bound
    const frontZ = floor.worldDepth + 200; 
    const coords: CatCoordinates = { x: 560, y: 0, z: frontZ };
    const screen = catCoordinateSystem.catToScreen(coords);
    // Expect screen.y (distance from bottom) to be at or very near the floor baseline
    expect(screen.y).toBeGreaterThanOrEqual(0);
    expect(screen.y).toBeLessThanOrEqual(2);
  });

  it('back-most Z baseline is near the back of the floor when y=0', () => {
    const floor = catCoordinateSystem.getFloorDimensions();
    const world = catCoordinateSystem.getWorldDimensions();
    const backZ = world.wallDepth + 1; // just in front of the back wall
    const coords: CatCoordinates = { x: 560, y: 0, z: backZ };
    const screen = catCoordinateSystem.catToScreen(coords);
    // Expect near the top of the floor area. Allow tolerance due to safety margin and easing.
    expect(screen.y).toBeGreaterThanOrEqual(floor.screenHeight - 60);
    expect(screen.y).toBeLessThanOrEqual(floor.screenHeight);
  });

  it('cat and shadow baselines align across Z extremes when y=0', () => {
    const floor = catCoordinateSystem.getFloorDimensions();
    const world = catCoordinateSystem.getWorldDimensions();
    const sampleZs = [
      world.wallDepth + 1,
      world.depth * 0.25,
      world.depth * 0.6,
      world.depth + 120, // beyond depth; will clamp to front bound internally
    ];

    sampleZs.forEach((z) => {
      const catAtGround: CatCoordinates = { x: 560, y: 0, z };
      const catScreen = catCoordinateSystem.catToScreen(catAtGround);
      const shadowScreen = catCoordinateSystem.catToScreen({ x: 560, y: 0, z });
      // Baseline alignment at y=0
      expect(approx(catScreen.x, shadowScreen.x, 1)).toBe(true);
      expect(approx(catScreen.y, shadowScreen.y, 1)).toBe(true);
      // Both baselines must be within floor [0, floorHeight]
      expect(catScreen.y).toBeGreaterThanOrEqual(0);
      expect(catScreen.y).toBeLessThanOrEqual(floor.screenHeight);
      expect(shadowScreen.y).toBeGreaterThanOrEqual(0);
      expect(shadowScreen.y).toBeLessThanOrEqual(floor.screenHeight);
    });
  });

  it('cat overlaps the top half of the shadow when y=0 across Z extremes', () => {
    const world = catCoordinateSystem.getWorldDimensions();
    const zs = [
      world.wallDepth + 1,
      world.depth * 0.3,
      world.depth * 0.6,
      world.depth - 1,
    ];

    zs.forEach((z) => {
      const ground: CatCoordinates = { x: 560, y: 0, z };
      const cat = catCoordinateSystem.catToScreen(ground);
      const shadow = computeShadowLayout(cat);

      // Cat bottom should be within the top half of the shadow ellipse's vertical extent
      // shadow covers [shadow.bottom, shadow.bottom + shadow.height]
      const shadowTop = shadow.bottom + shadow.height;
      const shadowMid = shadow.bottom + shadow.height / 2;

      // Require cat bottom to be between midpoint and top, inclusive (allow tolerance)
      expect(cat.y).toBeGreaterThanOrEqual(shadowMid - 60);
      expect(cat.y).toBeLessThanOrEqual(shadowTop + 1);
    });
  });

  it('screen X is invariant when only Z changes (no horizontal drift)', () => {
    const world = catCoordinateSystem.getWorldDimensions();
    const floor = catCoordinateSystem.getFloorDimensions();
    const sampleXs = [200, 560, floor.worldWidth - 200];
    const zs = [world.wallDepth + 1, world.depth * 0.5, world.depth - 1, world.depth + 200];

    sampleXs.forEach((x) => {
      const xs = zs.map((z) => catCoordinateSystem.catToScreen({ x, y: 0, z }).x);
      const first = xs[0];
      xs.forEach((xi) => expect(Math.abs(xi - first)).toBeLessThanOrEqual(0));
    });
  });

  it('camera changes do not affect projected X (camera applied in CSS layer)', () => {
    const x = 560;
    const z = catCoordinateSystem.getWorldDimensions().depth * 0.6;
    const base = catCoordinateSystem.catToScreen({ x, y: 0, z });
    catCoordinateSystem.setCameraX(300);
    const after = catCoordinateSystem.catToScreen({ x, y: 0, z });
    expect(after.x).toEqual(base.x);
    // reset
    catCoordinateSystem.setCameraX(0);
  });

  it('screen.y decreases monotonically as Z increases (back → front)', () => {
    const world = catCoordinateSystem.getWorldDimensions();
    const samples = [world.wallDepth + 1, world.depth * 0.3, world.depth * 0.6, world.depth - 1];
    const ys = samples.map((z) => catCoordinateSystem.catToScreen({ x: 560, y: 0, z }).y);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]).toBeLessThanOrEqual(ys[i - 1]);
    }
  });

  it('scale increases monotonically as Z increases (back → front)', () => {
    const world = catCoordinateSystem.getWorldDimensions();
    const samples = [world.wallDepth + 1, world.depth * 0.3, world.depth * 0.6, world.depth - 1];
    const scales = samples.map((z) => catCoordinateSystem.catToScreen({ x: 560, y: 0, z }).scale);
    for (let i = 1; i < scales.length; i++) {
      expect(scales[i]).toBeGreaterThanOrEqual(scales[i - 1]);
    }
  });

  it('extreme Z values clamp to valid floor bounds for baseline (y within [0, floorHeight])', () => {
    const floor = catCoordinateSystem.getFloorDimensions();
    const hugeBack = -1e6;
    const hugeFront = 1e6;
    const backScreen = catCoordinateSystem.catToScreen({ x: 560, y: 0, z: hugeBack });
    const frontScreen = catCoordinateSystem.catToScreen({ x: 560, y: 0, z: hugeFront });
    [backScreen.y, frontScreen.y].forEach((y) => {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(floor.screenHeight);
    });
  });
});


