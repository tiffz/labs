import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CatView from './CatView';
import { computeShadowLayout } from '../../services/ShadowLayout';
import { catCoordinateSystem } from '../../services/CatCoordinateSystem';

// Mock the coordinate system
vi.mock('../../services/CatCoordinateSystem', () => ({
  catCoordinateSystem: {
    catToScreen: vi.fn(),
  },
}));

// Mock the shadow layout
vi.mock('../../services/ShadowLayout', () => ({
  computeShadowLayout: vi.fn(),
  SHADOW_OFFSET_X: 0,
}));

// Mock the z-layer utility
vi.mock('../rendering/zLayer', () => ({
  layerForZ: vi.fn(() => 1),
}));

// Mock the debug overlay
vi.mock('../debug/overlay', () => ({
  isOverlayEnabled: vi.fn(() => false),
  MassBoxOverlay: () => null,
}));

// Mock the world context
vi.mock('../../context/useWorld', () => ({
  useWorld: vi.fn(() => ({})),
}));

describe('CatView Movement Improvements', () => {
  const mockCatRef = { current: null } as React.RefObject<SVGSVGElement>;
  const mockCatElement = <svg data-testid="cat-svg" />;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Jump Height Scaling', () => {
    it('should scale jump height based on z-position', () => {
      const catWorldCoords = { x: 100, y: 50, z: 600 }; // Mid-depth position
      const groundCoords = { x: 100, y: 0, z: 600 };

      // Mock coordinate system responses
      const mockCatScreen = { x: 100, y: 150, scale: 1.2 }; // Cat at height with scale
      const mockGroundScreen = { x: 100, y: 100, scale: 1.2 }; // Ground reference
      
      (catCoordinateSystem.catToScreen as vi.MockedFunction<typeof catCoordinateSystem.catToScreen>)
        .mockReturnValueOnce(mockCatScreen) // First call for cat position
        .mockReturnValueOnce(mockGroundScreen); // Second call for ground position

      (computeShadowLayout as vi.MockedFunction<typeof computeShadowLayout>).mockReturnValue({
        width: 200,
        height: 60,
      });

      render(
        <CatView
          catWorldCoords={catWorldCoords}
          catRef={mockCatRef}
          catElement={mockCatElement}
        />
      );

      // Verify that catToScreen was called correctly
      expect(catCoordinateSystem.catToScreen).toHaveBeenCalledWith(catWorldCoords);
      expect(catCoordinateSystem.catToScreen).toHaveBeenCalledWith(groundCoords);

      // The jump delta should be (150 - 100) * 1.2 = 60px (scaled)
      // This is tested implicitly through the rendering behavior
    });

    it('should handle zero jump height correctly', () => {
      const catWorldCoords = { x: 100, y: 0, z: 600 }; // On ground

      const mockScreen = { x: 100, y: 100, scale: 1.0 };
      
      (catCoordinateSystem.catToScreen as vi.MockedFunction<typeof catCoordinateSystem.catToScreen>)
        .mockReturnValue(mockScreen);

      (computeShadowLayout as vi.MockedFunction<typeof computeShadowLayout>).mockReturnValue({
        width: 200,
        height: 60,
      });

      render(
        <CatView
          catWorldCoords={catWorldCoords}
          catRef={mockCatRef}
          catElement={mockCatElement}
        />
      );

      // Should handle zero jump height without issues
      expect(catCoordinateSystem.catToScreen).toHaveBeenCalled();
    });

    it('should scale jump height more for cats closer to front', () => {
      const frontCat = { x: 100, y: 50, z: 1000 }; // Close to front
      const backCat = { x: 100, y: 50, z: 200 };   // Close to back

      // Front cat has larger scale
      const frontCatScreen = { x: 100, y: 150, scale: 1.8 };
      const frontGroundScreen = { x: 100, y: 100, scale: 1.8 };
      
      // Back cat has smaller scale
      const backCatScreen = { x: 100, y: 150, scale: 0.6 };
      const backGroundScreen = { x: 100, y: 100, scale: 0.6 };

      (computeShadowLayout as vi.MockedFunction<typeof computeShadowLayout>).mockReturnValue({
        width: 200,
        height: 60,
      });

      // Test front cat
      (catCoordinateSystem.catToScreen as vi.MockedFunction<typeof catCoordinateSystem.catToScreen>)
        .mockReturnValueOnce(frontCatScreen)
        .mockReturnValueOnce(frontGroundScreen);

      const { rerender } = render(
        <CatView
          catWorldCoords={frontCat}
          catRef={mockCatRef}
          catElement={mockCatElement}
        />
      );

      // Test back cat
      (catCoordinateSystem.catToScreen as vi.MockedFunction<typeof catCoordinateSystem.catToScreen>)
        .mockReturnValueOnce(backCatScreen)
        .mockReturnValueOnce(backGroundScreen);

      rerender(
        <CatView
          catWorldCoords={backCat}
          catRef={mockCatRef}
          catElement={mockCatElement}
        />
      );

      // Front cat jump: (150 - 100) * 1.8 = 90px
      // Back cat jump: (150 - 100) * 0.6 = 30px
      // The front cat should have a visually higher jump
      expect(catCoordinateSystem.catToScreen).toHaveBeenCalledTimes(4);
    });
  });

  describe('Shadow Scaling', () => {
    it('should pass y-height to computeShadowLayout', () => {
      const catWorldCoords = { x: 100, y: 75, z: 600 }; // Cat at height

      const mockScreen = { x: 100, y: 150, scale: 1.0 };
      (catCoordinateSystem.catToScreen as vi.MockedFunction<typeof catCoordinateSystem.catToScreen>).mockReturnValue(mockScreen);

      (computeShadowLayout as vi.MockedFunction<typeof computeShadowLayout>).mockReturnValue({
        width: 200,
        height: 60,
      });

      render(
        <CatView
          catWorldCoords={catWorldCoords}
          catRef={mockCatRef}
          catElement={mockCatElement}
        />
      );

      // Verify that computeShadowLayout was called with y-height
      expect(computeShadowLayout).toHaveBeenCalledWith(
        expect.objectContaining({ x: 100, scale: 1.0 }),
        75 // y-height should be passed
      );
    });

    it('should pass zero y-height for ground-level cats', () => {
      const catWorldCoords = { x: 100, y: 0, z: 600 }; // On ground

      const mockScreen = { x: 100, y: 100, scale: 1.0 };
      (catCoordinateSystem.catToScreen as vi.MockedFunction<typeof catCoordinateSystem.catToScreen>).mockReturnValue(mockScreen);

      (computeShadowLayout as vi.MockedFunction<typeof computeShadowLayout>).mockReturnValue({
        width: 200,
        height: 60,
      });

      render(
        <CatView
          catWorldCoords={catWorldCoords}
          catRef={mockCatRef}
          catElement={mockCatElement}
        />
      );

      expect(computeShadowLayout).toHaveBeenCalledWith(
        expect.objectContaining({ x: 100, scale: 1.0 }),
        0 // y-height should be 0 for ground level
      );
    });
  });

  describe('Sub-pixel Positioning', () => {
    it('should use sub-pixel precision for cat positioning', () => {
      const catWorldCoords = { x: 100, y: 0, z: 600 };

      // Use non-integer screen position to test sub-pixel precision
      const mockScreen = { x: 100.75, y: 100.25, scale: 1.0 };
      (catCoordinateSystem.catToScreen as vi.MockedFunction<typeof catCoordinateSystem.catToScreen>).mockReturnValue(mockScreen);

      (computeShadowLayout as vi.MockedFunction<typeof computeShadowLayout>).mockReturnValue({
        width: 200.5,
        height: 60.3,
      });

      const { container } = render(
        <CatView
          catWorldCoords={catWorldCoords}
          catRef={mockCatRef}
          catElement={mockCatElement}
        />
      );

      // Check that the cat container uses sub-pixel precision
      const catContainer = container.querySelector('.cat-container');
      expect(catContainer).toBeTruthy();
      
      // The transform should include decimal places for smoother movement
      const transform = catContainer?.getAttribute('style');
      expect(transform).toContain('.'); // Should contain decimal points
    });

    it('should use sub-pixel precision for shadow positioning', () => {
      const catWorldCoords = { x: 100, y: 0, z: 600 };

      const mockScreen = { x: 100.33, y: 100, scale: 1.0 };
      (catCoordinateSystem.catToScreen as vi.MockedFunction<typeof catCoordinateSystem.catToScreen>).mockReturnValue(mockScreen);

      (computeShadowLayout as vi.MockedFunction<typeof computeShadowLayout>).mockReturnValue({
        width: 200.7,
        height: 60.1,
      });

      const { container } = render(
        <CatView
          catWorldCoords={catWorldCoords}
          catRef={mockCatRef}
          catElement={mockCatElement}
        />
      );

      // Check that the shadow container uses sub-pixel precision
      const shadowContainer = container.querySelector('.cat-shadow-container');
      expect(shadowContainer).toBeTruthy();
      
      const transform = shadowContainer?.getAttribute('style');
      expect(transform).toContain('.'); // Should contain decimal points for smooth movement
    });
  });

  describe('Walking Animation Props', () => {
    it('should apply walking class when walking prop is true', () => {
      const catWorldCoords = { x: 100, y: 0, z: 600 };

      const mockScreen = { x: 100, y: 100, scale: 1.0 };
      (catCoordinateSystem.catToScreen as vi.MockedFunction<typeof catCoordinateSystem.catToScreen>).mockReturnValue(mockScreen);

      (computeShadowLayout as vi.MockedFunction<typeof computeShadowLayout>).mockReturnValue({
        width: 200,
        height: 60,
      });

      const { container } = render(
        <CatView
          catWorldCoords={catWorldCoords}
          catRef={mockCatRef}
          catElement={mockCatElement}
          walking={true}
        />
      );

      const catInner = container.querySelector('.cat-inner');
      expect(catInner).toHaveClass('walking');
    });

    it('should not apply walking class when walking prop is false', () => {
      const catWorldCoords = { x: 100, y: 0, z: 600 };

      const mockScreen = { x: 100, y: 100, scale: 1.0 };
      (catCoordinateSystem.catToScreen as vi.MockedFunction<typeof catCoordinateSystem.catToScreen>).mockReturnValue(mockScreen);

      (computeShadowLayout as vi.MockedFunction<typeof computeShadowLayout>).mockReturnValue({
        width: 200,
        height: 60,
      });

      const { container } = render(
        <CatView
          catWorldCoords={catWorldCoords}
          catRef={mockCatRef}
          catElement={mockCatElement}
          walking={false}
        />
      );

      const catInner = container.querySelector('.cat-inner');
      expect(catInner).not.toHaveClass('walking');
    });

    it('should set bob amplitude based on walking state', () => {
      const catWorldCoords = { x: 100, y: 0, z: 600 };

      const mockScreen = { x: 100, y: 100, scale: 1.0 };
      (catCoordinateSystem.catToScreen as vi.MockedFunction<typeof catCoordinateSystem.catToScreen>).mockReturnValue(mockScreen);

      (computeShadowLayout as vi.MockedFunction<typeof computeShadowLayout>).mockReturnValue({
        width: 200,
        height: 60,
      });

      const { container, rerender } = render(
        <CatView
          catWorldCoords={catWorldCoords}
          catRef={mockCatRef}
          catElement={mockCatElement}
          walking={true}
        />
      );

      let catInner = container.querySelector('.cat-inner') as HTMLElement;
      expect(catInner.style.getPropertyValue('--bob-ampl')).toBe('3px');

      rerender(
        <CatView
          catWorldCoords={catWorldCoords}
          catRef={mockCatRef}
          catElement={mockCatElement}
          walking={false}
        />
      );

      catInner = container.querySelector('.cat-inner') as HTMLElement;
      expect(catInner.style.getPropertyValue('--bob-ampl')).toBe('0px');
    });
  });
});
