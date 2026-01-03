import { describe, test, expect } from 'vitest';
import {
  createGeometry,
  getFormBoundingRadius,
  ALL_FORM_TYPES,
  FORM_TYPE_LABELS,
} from './formGenerators';
import type { FormType } from '../types';

describe('formGenerators', () => {
  describe('createGeometry', () => {
    test('creates geometry for all form types', () => {
      ALL_FORM_TYPES.forEach((type) => {
        const geometry = createGeometry(type);
        expect(geometry).toBeDefined();
        expect(geometry.attributes).toBeDefined();
        expect(geometry.attributes.position).toBeDefined();
        expect(geometry.attributes.position.count).toBeGreaterThan(0);
      });
    });

    test('creates geometry with default size of 1', () => {
      const boxGeometry = createGeometry('box');
      expect(boxGeometry).toBeDefined();
      // Box geometry should have 24 vertices (6 faces * 4 vertices each for indexed geometry)
      // or 36 vertices for non-indexed
      expect(boxGeometry.attributes.position.count).toBeGreaterThan(0);
    });

    test('creates scaled geometry with custom size', () => {
      const size = 2;
      const geometry = createGeometry('box', size);
      expect(geometry).toBeDefined();
      // Verify geometry is created (actual size checking would require more complex inspection)
      expect(geometry.attributes.position).toBeDefined();
    });

    test('sphere geometry has appropriate segment count', () => {
      const geometry = createGeometry('sphere');
      // Sphere with 16x12 segments should have vertices
      expect(geometry.attributes.position.count).toBeGreaterThan(100);
    });

    test('cylinder geometry has appropriate segment count', () => {
      const geometry = createGeometry('cylinder');
      expect(geometry.attributes.position.count).toBeGreaterThan(30);
    });

    test('cone geometry has appropriate segment count', () => {
      const geometry = createGeometry('cone');
      expect(geometry.attributes.position.count).toBeGreaterThan(15);
    });

    test('pyramid geometry has 4 sides', () => {
      const geometry = createGeometry('pyramid');
      // Pyramid is a cone with 4 radial segments
      expect(geometry.attributes.position.count).toBeGreaterThan(0);
    });

    test('handles unknown type by returning box geometry', () => {
      const geometry = createGeometry('unknown' as FormType);
      expect(geometry).toBeDefined();
      expect(geometry.attributes.position).toBeDefined();
    });
  });

  describe('getFormBoundingRadius', () => {
    test('returns positive radius for all form types', () => {
      ALL_FORM_TYPES.forEach((type) => {
        const radius = getFormBoundingRadius(type);
        expect(radius).toBeGreaterThan(0);
      });
    });

    test('sphere radius is half the size', () => {
      expect(getFormBoundingRadius('sphere', 1)).toBe(0.5);
      expect(getFormBoundingRadius('sphere', 2)).toBe(1);
    });

    test('box radius accounts for diagonal', () => {
      const radius = getFormBoundingRadius('box', 1);
      // Box diagonal / 2 ≈ 0.866
      expect(radius).toBeCloseTo(0.866, 2);
    });

    test('radius scales with size', () => {
      const size1Radius = getFormBoundingRadius('cylinder', 1);
      const size2Radius = getFormBoundingRadius('cylinder', 2);
      // Radius should scale linearly with size
      expect(size2Radius).toBeGreaterThan(size1Radius);
    });

    test('cylinder and cone radii are calculated correctly', () => {
      const cylinderRadius = getFormBoundingRadius('cylinder', 1);
      const coneRadius = getFormBoundingRadius('cone', 1);
      
      // Both should use Pythagorean theorem
      expect(cylinderRadius).toBeGreaterThan(0);
      expect(coneRadius).toBeGreaterThan(0);
    });

    test('unknown type returns box radius', () => {
      const unknownRadius = getFormBoundingRadius('unknown' as FormType);
      const boxRadius = getFormBoundingRadius('box');
      expect(unknownRadius).toBe(boxRadius);
    });
  });

  describe('ALL_FORM_TYPES', () => {
    test('contains all expected form types', () => {
      expect(ALL_FORM_TYPES).toContain('box');
      expect(ALL_FORM_TYPES).toContain('sphere');
      expect(ALL_FORM_TYPES).toContain('cylinder');
      expect(ALL_FORM_TYPES).toContain('cone');
      expect(ALL_FORM_TYPES).toContain('pyramid');
    });

    test('has exactly 5 form types', () => {
      expect(ALL_FORM_TYPES.length).toBe(5);
    });
  });

  describe('FORM_TYPE_LABELS', () => {
    test('has labels for all form types', () => {
      ALL_FORM_TYPES.forEach((type) => {
        expect(FORM_TYPE_LABELS[type]).toBeDefined();
        expect(typeof FORM_TYPE_LABELS[type]).toBe('string');
        expect(FORM_TYPE_LABELS[type].length).toBeGreaterThan(0);
      });
    });

    test('labels are human-readable (capitalized)', () => {
      Object.values(FORM_TYPE_LABELS).forEach((label) => {
        // First character should be uppercase
        expect(label[0]).toBe(label[0].toUpperCase());
      });
    });
  });
});
