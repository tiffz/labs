import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { UnifiedFurnitureRenderer } from './UnifiedFurnitureRenderer';
import { createFurnitureConfig, FurniturePositioning } from './furnitureUtils';

// Mock the coordinate system
vi.mock('../../services/CatCoordinateSystem', () => ({
  catCoordinateSystem: {
    catToScreen: vi.fn(() => ({ x: 100, y: 50, scale: 1.0 })),
    wallToScreen: vi.fn(() => ({ x: 120, y: 80, scale: 0.8 })),
  },
}));

// Mock the coordinate system hook
vi.mock('../../hooks/useCoordinateSystem', () => ({
  useCoordinateSystem: vi.fn(() => 1),
}));

// Mock debug overlay
vi.mock('../debug/overlay', () => ({
  isOverlayEnabled: vi.fn(() => false),
}));

// Mock z-layer
vi.mock('./zLayer', () => ({
  layerForZ: vi.fn((z: number) => z),
}));

// Mock furniture shadow
vi.mock('../game/furniture/FurnitureShadow', () => ({
  FurnitureShadow: ({ kind }: { kind: string }) => <ellipse data-testid={`shadow-${kind}`} />,
}));

describe('UnifiedFurnitureRenderer', () => {
  describe('createFurnitureConfig', () => {
    it('should create valid floor furniture config', () => {
      const config = createFurnitureConfig({
        kind: 'test-furniture',
        ...FurniturePositioning.floor(100, 200),
        viewBoxWidth: 80,
        viewBoxHeight: 100,
      });

      expect(config).toEqual({
        kind: 'test-furniture',
        placement: 'floor',
        x: 100,
        z: 200,
        viewBoxWidth: 80,
        viewBoxHeight: 100,
        scaleMultiplier: 1.0,
        zIndexOffset: 0,
      });
    });

    it('should create valid wall furniture config', () => {
      const config = createFurnitureConfig({
        kind: 'test-painting',
        ...FurniturePositioning.wall(100, 150, 200),
        viewBoxWidth: 60,
        viewBoxHeight: 80,
      });

      expect(config).toEqual({
        kind: 'test-painting',
        placement: 'wall',
        x: 100,
        y: 150,
        z: 200,
        viewBoxWidth: 60,
        viewBoxHeight: 80,
        scaleMultiplier: 1.0,
        zIndexOffset: 0,
      });
    });

    it('should throw error for invalid dimensions', () => {
      expect(() => {
        createFurnitureConfig({
          kind: 'invalid',
          ...FurniturePositioning.floor(0, 0),
          viewBoxWidth: 0,
          viewBoxHeight: 100,
        });
      }).toThrow('Invalid viewBox dimensions');
    });

    it('should throw error for wall furniture without y coordinate', () => {
      expect(() => {
        createFurnitureConfig({
          kind: 'wall-item',
          placement: 'wall',
          x: 100,
          z: 200,
          viewBoxWidth: 80,
          viewBoxHeight: 100,
        });
      }).toThrow('Wall-mounted furniture wall-item requires y coordinate');
    });
  });

  describe('UnifiedFurnitureRenderer', () => {
    it('should render floor furniture correctly', () => {
      const config = createFurnitureConfig({
        kind: 'test-couch',
        ...FurniturePositioning.floor(100, 200),
        viewBoxWidth: 80,
        viewBoxHeight: 100,
      });

      render(
        <UnifiedFurnitureRenderer {...config} ariaLabel="test couch">
          <rect x={10} y={10} width={60} height={80} fill="blue" data-testid="furniture-content" />
        </UnifiedFurnitureRenderer>
      );

      // Check that the furniture container is rendered
      const container = screen.getByLabelText('test couch');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('unified-furniture', 'test-couch');

      // Check that SVG content is rendered
      const content = screen.getByTestId('furniture-content');
      expect(content).toBeInTheDocument();

      // Check that shadow is rendered
      const shadow = screen.getByTestId('shadow-test-couch');
      expect(shadow).toBeInTheDocument();
    });

    it('should render wall furniture correctly', () => {
      const config = createFurnitureConfig({
        kind: 'test-painting',
        ...FurniturePositioning.wall(100, 150, 200),
        viewBoxWidth: 60,
        viewBoxHeight: 80,
      });

      render(
        <UnifiedFurnitureRenderer {...config} ariaLabel="test painting">
          <rect x={5} y={5} width={50} height={70} fill="red" data-testid="painting-content" />
        </UnifiedFurnitureRenderer>
      );

      // Check that the painting container is rendered
      const container = screen.getByLabelText('test painting');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('unified-furniture', 'test-painting');

      // Check that SVG content is rendered
      const content = screen.getByTestId('painting-content');
      expect(content).toBeInTheDocument();
    });

    it('should apply scale multiplier correctly', () => {
      const config = createFurnitureConfig({
        kind: 'scaled-furniture',
        ...FurniturePositioning.floor(100, 200),
        viewBoxWidth: 80,
        viewBoxHeight: 100,
        scaleMultiplier: 1.5,
      });

      render(
        <UnifiedFurnitureRenderer {...config}>
          <rect data-testid="scaled-content" />
        </UnifiedFurnitureRenderer>
      );

      const container = screen.getByLabelText('scaled-furniture');
      
      // With scale 1.0 from mock and multiplier 1.5, final scale should be 1.5
      // Base dimensions 80x100 * 1.5 = 120x150
      expect(container).toHaveStyle({
        width: '120px',
        height: '150px',
      });
    });

    it('should handle custom class names', () => {
      const config = createFurnitureConfig({
        kind: 'custom-furniture',
        ...FurniturePositioning.floor(100, 200),
        viewBoxWidth: 80,
        viewBoxHeight: 100,
      });

      render(
        <UnifiedFurnitureRenderer {...config} className="custom-class">
          <rect data-testid="custom-content" />
        </UnifiedFurnitureRenderer>
      );

      const container = screen.getByLabelText('custom-furniture');
      expect(container).toHaveClass('unified-furniture', 'custom-furniture', 'custom-class');
    });
  });

  describe('FurniturePositioning', () => {
    it('should create floor positioning config', () => {
      const config = FurniturePositioning.floor(150, 300);
      expect(config).toEqual({
        placement: 'floor',
        x: 150,
        z: 300,
      });
    });

    it('should create wall positioning config', () => {
      const config = FurniturePositioning.wall(150, 200, 300);
      expect(config).toEqual({
        placement: 'wall',
        x: 150,
        y: 200,
        z: 300,
      });
    });
  });
});
