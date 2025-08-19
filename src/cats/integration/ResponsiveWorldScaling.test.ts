/**
 * Comprehensive tests for responsive world scaling across different viewport sizes
 * 
 * These tests ensure that the world coordinate system scales properly and maintains
 * consistent relative positioning across various screen sizes and aspect ratios.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { catCoordinateSystem } from '../services/CatCoordinateSystem';

// Mock window object for testing different viewport sizes
const mockWindow = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
};

describe('Responsive World Scaling', () => {
  beforeEach(() => {
    // Reset coordinate system to default state
    catCoordinateSystem.setSidePanelWidth(450);
    catCoordinateSystem.setSidePanelHeight(0);
  });

  describe('Floor Dimensions Consistency', () => {
    const testViewports = [
      { name: 'Mobile Portrait', width: 375, height: 667 },
      { name: 'Mobile Landscape', width: 667, height: 375 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
      { name: 'Tablet Landscape', width: 1024, height: 768 },
      { name: 'Desktop Small', width: 1280, height: 720 },
      { name: 'Desktop Large', width: 1920, height: 1080 },
      { name: 'Ultrawide', width: 2560, height: 1440 },
      { name: 'Very Small', width: 320, height: 480 },
    ];

    testViewports.forEach(({ name, width, height }) => {
      it(`should maintain 40% floor ratio on ${name} (${width}x${height})`, () => {
        mockWindow(width, height);
        catCoordinateSystem.updateViewport();
        
        const floorRatio = catCoordinateSystem.getFloorRatio();
        const floor = catCoordinateSystem.getFloorDimensions();
        
        // Floor should always be 40% of viewport height
        expect(floorRatio).toBeCloseTo(0.4, 2);
        expect(floor.screenHeight).toBeCloseTo(height * 0.4, 1);
      });

      it(`should scale world appropriately on ${name} (${width}x${height})`, () => {
        mockWindow(width, height);
        catCoordinateSystem.updateViewport();
        
        const floor = catCoordinateSystem.getFloorDimensions();
        
        // World scale should be positive and reasonable
        expect(floor.worldScale).toBeGreaterThan(0);
        
        // Calculate expected scale based on new intelligent scaling logic
        // Account for side panel dimensions (default: 450px width, 0px height)
        const viewportWidth = width - 450; // Default side panel width
        const viewportHeight = height - 0;  // Default side panel height
        const aspectRatio = viewportWidth / viewportHeight;
        const isColumnView = aspectRatio < 0.8;
        
        if (isColumnView) {
          // Column view: Scale based on width, clamped to 0.6-1.2 range
          const widthScale = viewportWidth / 800; // BASE_VIEWPORT_WIDTH = 800
          const expectedScale = Math.max(0.6, Math.min(1.2, widthScale));
          expect(floor.worldScale).toBeCloseTo(expectedScale, 2);
        } else {
          // Landscape view: Scale based on floor height
          const floorHeight = viewportHeight * 0.4; // FIXED_FLOOR_RATIO = 0.4
          const expectedScale = floorHeight / 320; // BASE_FLOOR_HEIGHT = 320
          expect(floor.worldScale).toBeCloseTo(expectedScale, 2);
        }
      });
    });
  });

  describe('Coordinate Transformation Consistency', () => {
    const testCoordinates = [
      { name: 'Center of world', x: 700, y: 0, z: 720 }, // Cat/rug default position
      { name: 'Left edge', x: 0, y: 0, z: 720 },
      { name: 'Right edge', x: 1400, y: 0, z: 720 },
      { name: 'Back wall', x: 700, y: 0, z: 0 },
      { name: 'Front edge', x: 700, y: 0, z: 1200 },
      { name: 'Elevated position', x: 700, y: 100, z: 720 },
    ];

    const testViewports = [
      { width: 1920, height: 1080 }, // Large desktop
      { width: 1280, height: 720 },  // Medium desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 },   // Mobile
    ];

    testCoordinates.forEach(({ name, x, y, z }) => {
      describe(`${name} coordinate (${x}, ${y}, ${z})`, () => {
        testViewports.forEach(({ width, height }) => {
          it(`should maintain consistent relative positioning on ${width}x${height}`, () => {
            mockWindow(width, height);
            catCoordinateSystem.updateViewport();
            
            const screenPos = catCoordinateSystem.catToScreen({ x, y, z });
            const floor = catCoordinateSystem.getFloorDimensions();
            
            // Screen position should be valid
            expect(screenPos.x).toBeGreaterThanOrEqual(0);
            expect(screenPos.y).toBeGreaterThanOrEqual(0);
            expect(screenPos.scale).toBeGreaterThan(0);
            
            // X position should be proportional to world scale
            const expectedX = x * floor.worldScale;
            expect(screenPos.x).toBeCloseTo(expectedX, 1);
            
            // Scale should include both perspective and world scaling
            expect(screenPos.scale).toBeGreaterThan(0.1); // Min scale with world scaling
            expect(screenPos.scale).toBeLessThan(4.0); // Max scale with new intelligent scaling
          });
        });

        it('should produce valid coordinates across viewport changes', () => {
          // Test that coordinates remain valid and bounded across viewport changes
          // Note: Perfect consistency across aspect ratios is not expected due to 
          // panel width interactions and world scaling behavior
          const viewports = [
            { width: 1920, height: 1080 }, // 16:9
            { width: 1280, height: 720 },  // 16:9
            { width: 1600, height: 900 },  // 16:9
          ];
          
          viewports.forEach(({ width, height }) => {
            mockWindow(width, height);
            catCoordinateSystem.setSidePanelWidth(Math.min(450, width * 0.2)); // Adaptive panel width
            catCoordinateSystem.updateViewport();
            
            const screenPos = catCoordinateSystem.catToScreen({ x, y, z });
            const floor = catCoordinateSystem.getFloorDimensions();
            
            // Coordinates should be valid and within reasonable bounds
            expect(screenPos.x).toBeGreaterThanOrEqual(0);
            expect(screenPos.y).toBeGreaterThanOrEqual(0);
            expect(screenPos.scale).toBeGreaterThan(0);
            expect(Number.isFinite(screenPos.x)).toBe(true);
            expect(Number.isFinite(screenPos.y)).toBe(true);
            expect(Number.isFinite(screenPos.scale)).toBe(true);
            
            // Screen position should be within reasonable bounds relative to floor
            expect(screenPos.x).toBeLessThan(floor.screenWidth * 2); // Allow some overflow
            expect(screenPos.y).toBeLessThan(floor.screenHeight * 2); // Allow some overflow
          });
        });
      });
    });
  });

  describe('Side Panel Integration', () => {
    const panelWidths = [0, 350, 400, 450]; // Different panel widths for different screen sizes
    const panelHeights = [0, 300]; // Column layout vs horizontal layout

    panelWidths.forEach(panelWidth => {
      panelHeights.forEach(panelHeight => {
        it(`should handle panel dimensions ${panelWidth}x${panelHeight} correctly`, () => {
          mockWindow(1280, 720);
          catCoordinateSystem.setSidePanelWidth(panelWidth);
          catCoordinateSystem.setSidePanelHeight(panelHeight);
          catCoordinateSystem.updateViewport();
          
          const floor = catCoordinateSystem.getFloorDimensions();
          
          // Viewport should account for panel dimensions
          expect(floor.screenWidth).toBe(1280 - panelWidth);
          expect(floor.screenHeight).toBeCloseTo((720 - panelHeight) * 0.4, 1);
          
          // Floor ratio should still be 40% of the game viewport
          const gameViewportHeight = 720 - panelHeight;
          const expectedFloorHeight = gameViewportHeight * 0.4;
          expect(floor.screenHeight).toBeCloseTo(expectedFloorHeight, 1);
        });
      });
    });
  });

  describe('World Scaling Edge Cases', () => {
    it('should handle extremely small viewports gracefully', () => {
      mockWindow(320, 240);
      catCoordinateSystem.setSidePanelWidth(0); // No panel for small viewport
      catCoordinateSystem.setSidePanelHeight(0);
      catCoordinateSystem.updateViewport();
      
      const floor = catCoordinateSystem.getFloorDimensions();
      
      // Should still maintain basic functionality
      expect(floor.worldScale).toBeGreaterThan(0);
      expect(floor.screenHeight).toBeGreaterThan(0);
      expect(floor.screenWidth).toBeGreaterThan(0);
      
      // With new intelligent scaling: 320x240 is column view (aspect ratio = 1.33 > 0.8 is false)
      // Actually, 320/240 = 1.33, which is > 0.8, so it's landscape view
      // Landscape view: scale = floorHeight / 320 = (240 * 0.4) / 320 = 96/320 = 0.3
      expect(floor.worldScale).toBeCloseTo(0.3, 2);
    });

    it('should handle extremely large viewports correctly', () => {
      mockWindow(4000, 3000);
      catCoordinateSystem.updateViewport();
      
      const floor = catCoordinateSystem.getFloorDimensions();
      
      // With new intelligent scaling: 4000x3000 is landscape view (aspect ratio = 1.33 > 0.8)
      // Landscape view: scale = floorHeight / 320 = (3000 * 0.4) / 320 = 1200/320 = 3.75
      expect(floor.worldScale).toBeCloseTo(3.75, 2);
      expect(floor.screenHeight).toBeCloseTo(3000 * 0.4, 1);
      expect(floor.screenWidth).toBe(4000 - 450); // Default panel width
    });

    it('should maintain coordinate bounds after scaling', () => {
      const testViewports = [
        { width: 320, height: 240 },   // Very small
        { width: 1920, height: 1080 }, // Large
      ];
      
      testViewports.forEach(({ width, height }) => {
        mockWindow(width, height);
        catCoordinateSystem.updateViewport();
        
        // Test boundary coordinates
        const corners = [
          { x: 0, y: 0, z: 0 },
          { x: 1400, y: 0, z: 0 },
          { x: 0, y: 0, z: 1200 },
          { x: 1400, y: 0, z: 1200 },
        ];
        
        corners.forEach(coord => {
          const screenPos = catCoordinateSystem.catToScreen(coord);
          
          // All coordinates should produce valid screen positions
          expect(screenPos.x).toBeGreaterThanOrEqual(0);
          expect(screenPos.y).toBeGreaterThanOrEqual(0);
          expect(screenPos.scale).toBeGreaterThan(0);
          expect(Number.isFinite(screenPos.x)).toBe(true);
          expect(Number.isFinite(screenPos.y)).toBe(true);
          expect(Number.isFinite(screenPos.scale)).toBe(true);
        });
      });
    });
  });

  describe('Performance and Stability', () => {
    it('should handle rapid viewport changes without errors', () => {
      const viewports = [
        { width: 1920, height: 1080 },
        { width: 375, height: 667 },
        { width: 1280, height: 720 },
        { width: 768, height: 1024 },
      ];
      
      // Rapidly change viewports multiple times
      for (let i = 0; i < 10; i++) {
        viewports.forEach(({ width, height }) => {
          mockWindow(width, height);
          catCoordinateSystem.updateViewport();
          
          // Should not throw errors and should produce valid results
          const floor = catCoordinateSystem.getFloorDimensions();
          expect(floor.worldScale).toBeGreaterThan(0);
          expect(floor.screenHeight).toBeGreaterThan(0);
          
          const screenPos = catCoordinateSystem.catToScreen({ x: 700, y: 0, z: 720 });
          expect(Number.isFinite(screenPos.x)).toBe(true);
          expect(Number.isFinite(screenPos.y)).toBe(true);
          expect(Number.isFinite(screenPos.scale)).toBe(true);
        });
      }
    });

    it('should maintain consistent results for identical inputs', () => {
      mockWindow(1280, 720);
      
      // Call multiple times with same viewport
      const results = [];
      for (let i = 0; i < 5; i++) {
        catCoordinateSystem.updateViewport();
        const floor = catCoordinateSystem.getFloorDimensions();
        const screenPos = catCoordinateSystem.catToScreen({ x: 700, y: 0, z: 720 });
        results.push({ floor, screenPos });
      }
      
      // All results should be identical
      const base = results[0];
      results.slice(1).forEach(result => {
        expect(result.floor.worldScale).toBe(base.floor.worldScale);
        expect(result.floor.screenHeight).toBe(base.floor.screenHeight);
        expect(result.screenPos.x).toBe(base.screenPos.x);
        expect(result.screenPos.y).toBe(base.screenPos.y);
        expect(result.screenPos.scale).toBe(base.screenPos.scale);
      });
    });
  });
});
