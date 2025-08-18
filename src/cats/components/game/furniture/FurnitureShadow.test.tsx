import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FurnitureShadow } from './FurnitureShadow';
import { ABSOLUTE_SHADOW_HEIGHT } from '../../../services/ShadowLayout';

// Mock the furniture data
vi.mock('../../../data/furnitureData', () => ({
  getFurnitureConfig: (kind: string) => {
    const configs = {
      couch: {
        bounds: { width: 459, height: 204, depth: 50 },
        constraints: { occupiesFloor: true }
      },
      lamp: {
        bounds: { width: 32, height: 40, depth: 50 },
        constraints: { occupiesFloor: true }
      },
      furniture: { // scratching post
        bounds: { width: 80, height: 130, depth: 50 },
        constraints: { occupiesFloor: true }
      },
      painting: {
        bounds: { width: 100, height: 80, depth: 0 },
        constraints: { occupiesFloor: false } // wall-mounted
      }
    };
    return configs[kind as keyof typeof configs];
  }
}));

describe('FurnitureShadow', () => {
  test('renders shadow for floor-occupying furniture', () => {
    const { container } = render(
      <svg>
        <FurnitureShadow kind="couch" viewBoxWidth={459} />
      </svg>
    );

    const ellipse = container.querySelector('ellipse');
    expect(ellipse).toBeTruthy();
    expect(ellipse?.getAttribute('fill')).toBe('rgba(0,0,0,0.16)');
  });

  test('does not render shadow for wall-mounted furniture', () => {
    const { container } = render(
      <svg>
        <FurnitureShadow kind="painting" viewBoxWidth={100} />
      </svg>
    );

    const ellipse = container.querySelector('ellipse');
    expect(ellipse).toBeFalsy();
  });

  test('uses absolute shadow height for consistent appearance', () => {
    const { container } = render(
      <svg>
        <FurnitureShadow kind="couch" viewBoxWidth={459} />
      </svg>
    );

    const ellipse = container.querySelector('ellipse');
    const ry = parseFloat(ellipse?.getAttribute('ry') || '0');
    
    // Should use half of absolute shadow height (since ry is radius)
    expect(ry).toBeCloseTo(ABSOLUTE_SHADOW_HEIGHT / 2, 2);
  });

  test('adjusts shadow height for narrow objects to maintain proper proportions', () => {
    const { container: lampContainer } = render(
      <svg>
        <FurnitureShadow kind="lamp" viewBoxWidth={32} />
      </svg>
    );

    const lampEllipse = lampContainer.querySelector('ellipse');
    const lampRy = parseFloat(lampEllipse?.getAttribute('ry') || '0');
    
    // Lamp (32px wide) should have reduced height due to aspect ratio constraint
    // With minAspectRatio = 2.5: shadowDepth = 32 / 2.5 = 12.8, so ry = 6.4
    expect(lampRy).toBeCloseTo(6.4, 1);

    const { container: couchContainer } = render(
      <svg>
        <FurnitureShadow kind="couch" viewBoxWidth={459} />
      </svg>
    );

    const couchEllipse = couchContainer.querySelector('ellipse');
    const couchRy = parseFloat(couchEllipse?.getAttribute('ry') || '0');
    
    // Couch (459px wide) should use full absolute height
    expect(couchRy).toBeCloseTo(ABSOLUTE_SHADOW_HEIGHT / 2, 2);
  });

  test('uses mass width when provided for scratching post', () => {
    const { container } = render(
      <svg>
        <FurnitureShadow kind="furniture" viewBoxWidth={80} massWidth={44} />
      </svg>
    );

    const ellipse = container.querySelector('ellipse');
    const rx = parseFloat(ellipse?.getAttribute('rx') || '0');
    
    // Should use mass width (44) instead of viewBox width (80)
    expect(rx).toBe(22); // rx = massWidth / 2 = 44 / 2 = 22
  });

  test('centers shadow correctly within viewBox', () => {
    const viewBoxWidth = 100;
    const { container } = render(
      <svg>
        <FurnitureShadow kind="couch" viewBoxWidth={viewBoxWidth} />
      </svg>
    );

    const ellipse = container.querySelector('ellipse');
    const cx = parseFloat(ellipse?.getAttribute('cx') || '0');
    const cy = parseFloat(ellipse?.getAttribute('cy') || '0');
    
    expect(cx).toBe(viewBoxWidth / 2);
    expect(cy).toBe(0); // At baseline
  });

  test('maintains minimum aspect ratio for very narrow objects', () => {
    // Test with a very narrow object
    const { container } = render(
      <svg>
        <FurnitureShadow kind="lamp" viewBoxWidth={20} />
      </svg>
    );

    const ellipse = container.querySelector('ellipse');
    const rx = parseFloat(ellipse?.getAttribute('rx') || '0');
    const ry = parseFloat(ellipse?.getAttribute('ry') || '0');
    
    // Width should be 20, height should be 20/2.5 = 8
    expect(rx).toBe(10); // rx = width / 2
    expect(ry).toBeCloseTo(4, 1); // ry = height / 2 = 8 / 2 = 4
    
    // Aspect ratio should be maintained
    const aspectRatio = (rx * 2) / (ry * 2);
    expect(aspectRatio).toBeCloseTo(2.5, 1);
  });
});
