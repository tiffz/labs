import { describe, test, expect } from 'vitest';
import { generateFormsWithIntersections } from './randomPlacer';
import { DEFAULT_PLACEMENT_CONFIG } from '../types';
import type { PlacementConfig } from '../types';

describe('randomPlacer', () => {
  describe('generateFormsWithIntersections', () => {
    test('generates the requested number of forms', () => {
      const config: PlacementConfig = {
        ...DEFAULT_PLACEMENT_CONFIG,
        formCount: 5,
      };
      
      const forms = generateFormsWithIntersections(config);
      expect(forms.length).toBe(5);
    });

    test('generates forms with all required properties', () => {
      const forms = generateFormsWithIntersections(DEFAULT_PLACEMENT_CONFIG);
      
      forms.forEach((form) => {
        expect(form.id).toBeDefined();
        expect(typeof form.id).toBe('string');
        expect(form.id.length).toBeGreaterThan(0);
        
        expect(form.type).toBeDefined();
        expect(['box', 'sphere', 'cylinder', 'cone', 'pyramid']).toContain(form.type);
        
        expect(form.position).toBeDefined();
        expect(form.position).toHaveLength(3);
        form.position.forEach((p) => expect(typeof p).toBe('number'));
        
        expect(form.rotation).toBeDefined();
        expect(form.rotation).toHaveLength(3);
        form.rotation.forEach((r) => expect(typeof r).toBe('number'));
        
        expect(form.scale).toBeDefined();
        expect(form.scale).toHaveLength(3);
        form.scale.forEach((s) => {
          expect(typeof s).toBe('number');
          expect(s).toBeGreaterThan(0);
        });
        
        expect(form.geometry).toBeDefined();
        expect(form.radius).toBeDefined();
        expect(form.radius).toBeGreaterThan(0);
      });
    });

    test('first form is placed at origin', () => {
      const forms = generateFormsWithIntersections(DEFAULT_PLACEMENT_CONFIG);
      
      expect(forms[0].position[0]).toBe(0);
      expect(forms[0].position[1]).toBe(0);
      expect(forms[0].position[2]).toBe(0);
    });

    test('generates unique IDs for each form', () => {
      const forms = generateFormsWithIntersections(DEFAULT_PLACEMENT_CONFIG);
      const ids = forms.map((f) => f.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(forms.length);
    });

    test('respects enabled form types', () => {
      const config: PlacementConfig = {
        ...DEFAULT_PLACEMENT_CONFIG,
        enabledFormTypes: ['box', 'sphere'],
        formCount: 10,
      };
      
      const forms = generateFormsWithIntersections(config);
      
      forms.forEach((form) => {
        expect(['box', 'sphere']).toContain(form.type);
      });
    });

    test('returns empty array when no form types enabled', () => {
      const config: PlacementConfig = {
        ...DEFAULT_PLACEMENT_CONFIG,
        enabledFormTypes: [],
      };
      
      const forms = generateFormsWithIntersections(config);
      expect(forms).toHaveLength(0);
    });

    test('form scales are within size range', () => {
      const config: PlacementConfig = {
        ...DEFAULT_PLACEMENT_CONFIG,
        formSizeRange: [1.0, 2.0],
        formCount: 20,
      };
      
      const forms = generateFormsWithIntersections(config);
      
      forms.forEach((form) => {
        // All scale components should be equal (uniform scaling)
        expect(form.scale[0]).toBe(form.scale[1]);
        expect(form.scale[1]).toBe(form.scale[2]);
        
        // Scale should be within range
        expect(form.scale[0]).toBeGreaterThanOrEqual(1.0);
        expect(form.scale[0]).toBeLessThanOrEqual(2.0);
      });
    });

    test('rotations are within expected ranges', () => {
      const forms = generateFormsWithIntersections({
        ...DEFAULT_PLACEMENT_CONFIG,
        formCount: 20,
      });
      
      forms.forEach((form) => {
        // X and Z rotations should be limited (within ±π/6)
        expect(form.rotation[0]).toBeGreaterThanOrEqual(-Math.PI / 6);
        expect(form.rotation[0]).toBeLessThanOrEqual(Math.PI / 6);
        expect(form.rotation[2]).toBeGreaterThanOrEqual(-Math.PI / 6);
        expect(form.rotation[2]).toBeLessThanOrEqual(Math.PI / 6);
        
        // Y rotation can be full 360 degrees
        expect(form.rotation[1]).toBeGreaterThanOrEqual(0);
        expect(form.rotation[1]).toBeLessThanOrEqual(Math.PI * 2);
      });
    });

    test('subsequent forms are positioned near existing forms', () => {
      const forms = generateFormsWithIntersections({
        ...DEFAULT_PLACEMENT_CONFIG,
        formCount: 5,
      });
      
      // Check that subsequent forms are not too far from all others
      for (let i = 1; i < forms.length; i++) {
        const form = forms[i];
        let hasNearbyForm = false;
        
        for (let j = 0; j < i; j++) {
          const other = forms[j];
          const dist = Math.sqrt(
            (form.position[0] - other.position[0]) ** 2 +
            (form.position[1] - other.position[1]) ** 2 +
            (form.position[2] - other.position[2]) ** 2
          );
          
          // Combined radii plus some margin
          const maxDist = (form.radius + other.radius) * 3;
          
          if (dist < maxDist) {
            hasNearbyForm = true;
            break;
          }
        }
        
        expect(hasNearbyForm).toBe(true);
      }
    });

    test('handles single form type', () => {
      const config: PlacementConfig = {
        ...DEFAULT_PLACEMENT_CONFIG,
        enabledFormTypes: ['pyramid'],
        formCount: 5,
      };
      
      const forms = generateFormsWithIntersections(config);
      
      expect(forms.length).toBe(5);
      forms.forEach((form) => {
        expect(form.type).toBe('pyramid');
      });
    });

    test('generates consistent results with same config structure', () => {
      // Run multiple times and ensure basic structure is consistent
      for (let i = 0; i < 3; i++) {
        const forms = generateFormsWithIntersections(DEFAULT_PLACEMENT_CONFIG);
        expect(forms.length).toBe(DEFAULT_PLACEMENT_CONFIG.formCount);
        expect(forms[0].position).toEqual([0, 0, 0]);
      }
    });
  });
});
