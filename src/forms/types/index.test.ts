import { describe, test, expect } from 'vitest';
import {
  DEFAULT_PLACEMENT_CONFIG,
  DEFAULT_VIEW_SETTINGS,
} from './index';

describe('forms types', () => {
  describe('DEFAULT_PLACEMENT_CONFIG', () => {
    test('has all required properties', () => {
      expect(DEFAULT_PLACEMENT_CONFIG).toHaveProperty('enabledFormTypes');
      expect(DEFAULT_PLACEMENT_CONFIG).toHaveProperty('formCount');
      expect(DEFAULT_PLACEMENT_CONFIG).toHaveProperty('maxIntersectionsPerForm');
      expect(DEFAULT_PLACEMENT_CONFIG).toHaveProperty('formSizeRange');
    });

    test('enabledFormTypes contains all form types by default', () => {
      expect(DEFAULT_PLACEMENT_CONFIG.enabledFormTypes).toContain('box');
      expect(DEFAULT_PLACEMENT_CONFIG.enabledFormTypes).toContain('sphere');
      expect(DEFAULT_PLACEMENT_CONFIG.enabledFormTypes).toContain('cylinder');
      expect(DEFAULT_PLACEMENT_CONFIG.enabledFormTypes).toContain('cone');
      expect(DEFAULT_PLACEMENT_CONFIG.enabledFormTypes).toContain('pyramid');
    });

    test('formCount is a reasonable positive number', () => {
      expect(DEFAULT_PLACEMENT_CONFIG.formCount).toBeGreaterThan(0);
      expect(DEFAULT_PLACEMENT_CONFIG.formCount).toBeLessThanOrEqual(20);
    });

    test('maxIntersectionsPerForm is positive', () => {
      expect(DEFAULT_PLACEMENT_CONFIG.maxIntersectionsPerForm).toBeGreaterThan(0);
    });

    test('formSizeRange is a valid range', () => {
      expect(DEFAULT_PLACEMENT_CONFIG.formSizeRange).toHaveLength(2);
      expect(DEFAULT_PLACEMENT_CONFIG.formSizeRange[0]).toBeLessThan(
        DEFAULT_PLACEMENT_CONFIG.formSizeRange[1]
      );
      expect(DEFAULT_PLACEMENT_CONFIG.formSizeRange[0]).toBeGreaterThan(0);
    });
  });

  describe('DEFAULT_VIEW_SETTINGS', () => {
    test('has all required properties', () => {
      expect(DEFAULT_VIEW_SETTINGS).toHaveProperty('formOpacity');
      expect(DEFAULT_VIEW_SETTINGS).toHaveProperty('showIntersections');
      expect(DEFAULT_VIEW_SETTINGS).toHaveProperty('intersectionColor');
      expect(DEFAULT_VIEW_SETTINGS).toHaveProperty('formEdgeColor');
    });

    test('formOpacity is between 0 and 1', () => {
      expect(DEFAULT_VIEW_SETTINGS.formOpacity).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_VIEW_SETTINGS.formOpacity).toBeLessThanOrEqual(1);
    });

    test('showIntersections is a boolean', () => {
      expect(typeof DEFAULT_VIEW_SETTINGS.showIntersections).toBe('boolean');
    });

    test('intersectionColor is a valid hex color', () => {
      expect(DEFAULT_VIEW_SETTINGS.intersectionColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    test('formEdgeColor is a valid hex color', () => {
      expect(DEFAULT_VIEW_SETTINGS.formEdgeColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    test('default opacity is 60%', () => {
      expect(DEFAULT_VIEW_SETTINGS.formOpacity).toBe(0.6);
    });

    test('intersections are shown by default', () => {
      expect(DEFAULT_VIEW_SETTINGS.showIntersections).toBe(true);
    });
  });
});
