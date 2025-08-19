import { describe, it, expect, vi, beforeEach } from 'vitest';
import { floorSpaceManager } from './FloorSpaceManager';
import { catCoordinateSystem } from './CatCoordinateSystem';

// Mock the coordinate system
vi.mock('./CatCoordinateSystem', () => ({
  catCoordinateSystem: {
    getFloorDimensions: vi.fn(() => ({
      screenWidth: 800,
      screenHeight: 320, // 40% of 800px viewport (BASE_FLOOR_HEIGHT)
      worldWidth: 1400,
      worldDepth: 1200,
      worldScale: 1.0 // 320 / 320 = 1.0 (no scaling at base size)
    })),
    catToScreen: vi.fn(({ x, z }) => ({
      x: x * 0.8, // Mock scaling
      y: z * 0.2, // Mock Z to Y projection
      scale: 1.0
    })),
    getWorldDimensions: vi.fn(() => ({
      width: 1400,
      depth: 1200,
      height: 400,
      wallDepth: 0
    }))
  }
}));

describe('FloorSpaceManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateFloorLayout', () => {
    it('should calculate correct floor layout for a rug', () => {
      const config = floorSpaceManager.createRugConfig(700, 600, 420, 100);
      const layout = floorSpaceManager.calculateFloorLayout(config);

      expect(layout.floorScale).toBe(1.0); // Should use worldScale only
      expect(layout.screenWidth).toBe(336); // 420 * 0.8 (visual width * floor scale)
      expect(layout.screenHeight).toBe(80); // 100 * 0.8 (visual height * floor scale)
      expect(layout.floorDepthRatio).toBe(0.5); // 600 / 1200
    });

    it('should use floor scaling not perspective scaling', () => {
      const config = floorSpaceManager.createRugConfig(700, 600, 280, 60);
      const layout = floorSpaceManager.calculateFloorLayout(config);

      // Floor elements should use worldScale (1.0) not perspective scaling
      expect(layout.floorScale).toBe(1.0);
      
      // Verify it uses direct floor projection, not catToScreen (which applies perspective)
      expect(catCoordinateSystem.catToScreen).not.toHaveBeenCalled();
      
      // Verify getWorldDimensions was called for direct floor projection
      expect(catCoordinateSystem.getWorldDimensions).toHaveBeenCalled();
    });
  });

  describe('calculateLogicalFootprint', () => {
    it('should calculate correct logical footprint', () => {
      const config = floorSpaceManager.createRugConfig(700, 600, 420, 100);
      const footprint = floorSpaceManager.calculateLogicalFootprint(config);

      expect(footprint).toEqual({
        minX: 490, // 700 - 420/2
        maxX: 910, // 700 + 420/2
        minZ: 550, // 600 - 100/2
        maxZ: 650  // 600 + 100/2
      });
    });
  });

  describe('checkFloorOverlap', () => {
    it('should detect overlapping floor elements', () => {
      const rug1 = floorSpaceManager.createRugConfig(700, 600, 280, 60);
      const rug2 = floorSpaceManager.createRugConfig(720, 610, 280, 60);

      const overlap = floorSpaceManager.checkFloorOverlap(rug1, rug2);
      expect(overlap).toBe(true);
    });

    it('should detect non-overlapping floor elements', () => {
      const rug1 = floorSpaceManager.createRugConfig(700, 600, 280, 60);
      const rug2 = floorSpaceManager.createRugConfig(1000, 800, 280, 60);

      const overlap = floorSpaceManager.checkFloorOverlap(rug1, rug2);
      expect(overlap).toBe(false);
    });
  });

  describe('createRugConfig', () => {
    it('should create proper rug configuration', () => {
      const config = floorSpaceManager.createRugConfig(700, 600, 280, 60);

      expect(config.logicalWidth).toBe(280);
      expect(config.logicalDepth).toBe(60);
      expect(config.visualWidth).toBeCloseTo(224); // 280 * 0.8
      expect(config.visualHeight).toBeCloseTo(48); // 60 * 0.8
      expect(config.centerX).toBe(700);
      expect(config.centerZ).toBe(600);
    });
  });

  describe('createShadowConfig', () => {
    it('should create proper shadow configuration', () => {
      const config = floorSpaceManager.createShadowConfig(700, 600, 230);

      expect(config.logicalWidth).toBe(230);
      expect(config.logicalDepth).toBeCloseTo(36.8);
      expect(config.visualWidth).toBe(230);
      expect(config.visualHeight).toBeCloseTo(36.8);
      expect(config.centerX).toBe(700);
      expect(config.centerZ).toBe(600);
    });
  });

  describe('getFloorZIndex', () => {
    it('should return appropriate z-index for floor elements', () => {
      // Elements closer to front should have higher z-index (less negative)
      const backZIndex = floorSpaceManager.getFloorZIndex(0.1); // Near back
      const frontZIndex = floorSpaceManager.getFloorZIndex(0.9); // Near front

      expect(backZIndex).toBeLessThan(frontZIndex);
      expect(backZIndex).toBeLessThan(0); // Should be negative (under furniture)
      expect(frontZIndex).toBeLessThan(0); // Should be negative (under furniture)
    });
  });
});
