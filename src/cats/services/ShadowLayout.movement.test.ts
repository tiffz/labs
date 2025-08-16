import { describe, it, expect } from 'vitest';
import { computeShadowLayout } from './ShadowLayout';

describe('ShadowLayout Movement Improvements', () => {
  const baseScreenPosition = {
    x: 100,
    y: 50,
    scale: 1.0,
  };

  describe('Y-Height Based Shadow Scaling', () => {
    it('should maintain full shadow size at ground level (y=0)', () => {
      const layout = computeShadowLayout(baseScreenPosition, 0);
      
      // At ground level, shadow should be full size
      // Base width (230) * scale (1.0) * base shadow scale (0.8) = 184
      expect(layout.width).toBe(230 * 1.0 * 0.8);
      expect(layout.height).toBe(layout.width * 0.32); // Height ratio
    });

    it('should reduce shadow size as height increases', () => {
      const groundLayout = computeShadowLayout(baseScreenPosition, 0);
      const midHeightLayout = computeShadowLayout(baseScreenPosition, 200);
      const highLayout = computeShadowLayout(baseScreenPosition, 400);

      // Shadow should get smaller as height increases
      expect(midHeightLayout.width).toBeLessThan(groundLayout.width);
      expect(highLayout.width).toBeLessThan(midHeightLayout.width);
      
      // Heights should follow the same pattern
      expect(midHeightLayout.height).toBeLessThan(groundLayout.height);
      expect(highLayout.height).toBeLessThan(midHeightLayout.height);
    });

    it('should scale shadow to minimum 30% at maximum height', () => {
      const maxHeightLayout = computeShadowLayout(baseScreenPosition, 400);
      const groundLayout = computeShadowLayout(baseScreenPosition, 0);

      // At max height (400), height scale should be 0.3 (30%)
      const expectedScale = 0.3;
      const expectedWidth = 230 * 1.0 * 0.8 * expectedScale;
      
      expect(maxHeightLayout.width).toBeCloseTo(expectedWidth, 2);
      expect(maxHeightLayout.width).toBeCloseTo(groundLayout.width * 0.3, 2);
    });

    it('should not scale shadow below 30% even at extreme heights', () => {
      const extremeHeightLayout = computeShadowLayout(baseScreenPosition, 1000);
      const groundLayout = computeShadowLayout(baseScreenPosition, 0);

      // Even at extreme heights, shadow should not go below 30%
      const minimumExpectedWidth = groundLayout.width * 0.3;
      expect(extremeHeightLayout.width).toBeGreaterThanOrEqual(minimumExpectedWidth * 0.99); // Allow for floating point precision
    });

    it('should work with different base scales', () => {
      const smallScalePosition = { ...baseScreenPosition, scale: 0.5 };
      const largeScalePosition = { ...baseScreenPosition, scale: 2.0 };

      const smallGroundLayout = computeShadowLayout(smallScalePosition, 0);
      const smallHighLayout = computeShadowLayout(smallScalePosition, 200);
      
      const largeGroundLayout = computeShadowLayout(largeScalePosition, 0);
      const largeHighLayout = computeShadowLayout(largeScalePosition, 200);

      // Height scaling should work proportionally regardless of base scale
      const smallRatio = smallHighLayout.width / smallGroundLayout.width;
      const largeRatio = largeHighLayout.width / largeGroundLayout.width;
      
      expect(smallRatio).toBeCloseTo(largeRatio, 3);
    });

    it('should maintain aspect ratio during height scaling', () => {
      const groundLayout = computeShadowLayout(baseScreenPosition, 0);
      const heightLayout = computeShadowLayout(baseScreenPosition, 200);

      // Aspect ratio should remain the same (height = width * 0.32)
      const groundAspectRatio = groundLayout.height / groundLayout.width;
      const heightAspectRatio = heightLayout.height / heightLayout.width;

      expect(heightAspectRatio).toBeCloseTo(groundAspectRatio, 5);
      expect(groundAspectRatio).toBeCloseTo(0.32, 3);
    });

    it('should handle negative heights gracefully', () => {
      const negativeHeightLayout = computeShadowLayout(baseScreenPosition, -50);
      const groundLayout = computeShadowLayout(baseScreenPosition, 0);

      // Negative heights should be treated as ground level
      expect(negativeHeightLayout.width).toBeCloseTo(groundLayout.width, 2);
      expect(negativeHeightLayout.height).toBeCloseTo(groundLayout.height, 2);
    });

    it('should calculate correct shadow positioning', () => {
      const layout = computeShadowLayout(baseScreenPosition, 100);

      // Shadow should be centered on the baseline position
      expect(layout.bottom).toBe(baseScreenPosition.y - layout.height / 2);
      expect(layout.left).toBe(Math.round(baseScreenPosition.x) - Math.round(layout.width / 2));
    });

    it('should handle fractional heights smoothly', () => {
      const layout1 = computeShadowLayout(baseScreenPosition, 100.5);
      const layout2 = computeShadowLayout(baseScreenPosition, 100.7);

      // Small height differences should produce small size differences
      const sizeDifference = Math.abs(layout1.width - layout2.width);
      expect(sizeDifference).toBeLessThan(1); // Should be very small difference
    });
  });

  describe('Backward Compatibility', () => {
    it('should work without yHeight parameter (defaults to 0)', () => {
      const layoutWithHeight = computeShadowLayout(baseScreenPosition, 0);
      const layoutWithoutHeight = computeShadowLayout(baseScreenPosition);

      // Should produce identical results
      expect(layoutWithoutHeight.width).toBe(layoutWithHeight.width);
      expect(layoutWithoutHeight.height).toBe(layoutWithHeight.height);
      expect(layoutWithoutHeight.left).toBe(layoutWithHeight.left);
      expect(layoutWithoutHeight.bottom).toBe(layoutWithHeight.bottom);
    });
  });
});
