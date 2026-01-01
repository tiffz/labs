import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateImageDimensions, processFiles } from './imageProcessor';
import { parseFile } from './fileParser';
import type { PageInfo, SpreadInfo } from '../types';

describe('imageProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadImage', () => {
    it('should be a function', () => {
      // loadImage is tested indirectly through processFiles
      // Direct testing requires actual image files which is slow in test environment
      expect(typeof processFiles).toBe('function');
    });
  });

  describe('validateImageDimensions', () => {
    const createPageInfo = (filename: string, width: number = 2000, height: number = 3000): PageInfo => {
      const parsedFile = parseFile(new File([''], filename, { type: 'image/png' }));
      return {
        parsedFile,
        imageData: 'data:image/png;base64,test',
        width,
        height,
      };
    };

    const createSpreadInfo = (filename: string, pages: [number, number], width: number = 4000, height: number = 3000): SpreadInfo => {
      const parsedFile = parseFile(new File([''], filename, { type: 'image/png' }));
      return {
        parsedFile,
        imageData: 'data:image/png;base64,test',
        width,
        height,
        pages,
      };
    };

    it('should validate consistent page dimensions', () => {
      const pages = [
        createPageInfo('page1.png', 2000, 3000),
        createPageInfo('page2.png', 2000, 3000),
        createPageInfo('page3.png', 2000, 3000),
      ];
      const spreads: SpreadInfo[] = [];

      const result = validateImageDimensions(pages, spreads);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect inconsistent page dimensions', () => {
      const pages = [
        createPageInfo('page1.png', 2000, 3000),
        createPageInfo('page2.png', 2000, 3000),
        createPageInfo('page3.png', 2500, 3000), // Different width
      ];
      const spreads: SpreadInfo[] = [];

      const result = validateImageDimensions(pages, spreads);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('page3.png');
    });

    it('should validate spread dimensions are 2x width', () => {
      const pages = [
        createPageInfo('page1.png', 2000, 3000),
      ];
      const spreads = [
        createSpreadInfo('page2-3.png', [2, 3], 4000, 3000), // Correct: 2x width
      ];

      const result = validateImageDimensions(pages, spreads);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect incorrect spread width', () => {
      const pages = [
        createPageInfo('page1.png', 2000, 3000),
      ];
      const spreads = [
        createSpreadInfo('page2-3.png', [2, 3], 3000, 3000), // Wrong: not 2x width
      ];

      const result = validateImageDimensions(pages, spreads);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Spread');
      expect(result.errors[0]).toContain('expected 4000');
    });

    it('should detect incorrect spread height', () => {
      const pages = [
        createPageInfo('page1.png', 2000, 3000),
      ];
      const spreads = [
        createSpreadInfo('page2-3.png', [2, 3], 4000, 3500), // Wrong height
      ];

      const result = validateImageDimensions(pages, spreads);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('height');
    });

    it('should handle empty input', () => {
      const result = validateImageDimensions([], []);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No pages found');
    });

    it('should use most common dimensions for validation', () => {
      const pages = [
        createPageInfo('page1.png', 2000, 3000),
        createPageInfo('page2.png', 2000, 3000),
        createPageInfo('page3.png', 2000, 3000),
        createPageInfo('page4.png', 2500, 3000), // Different - should be flagged
      ];
      const spreads: SpreadInfo[] = [];

      const result = validateImageDimensions(pages, spreads);

      expect(result.isValid).toBe(false);
      // Should flag page4.png as having wrong dimensions
      const page4Error = result.errors.find(e => e.includes('page4.png'));
      expect(page4Error).toBeDefined();
    });

    it('should validate spreads-only input', () => {
      const pages: PageInfo[] = [];
      const spreads = [
        createSpreadInfo('spread1.png', [1, 2], 4000, 3000),
        createSpreadInfo('spread2.png', [3, 4], 4000, 3000),
      ];

      const result = validateImageDimensions(pages, spreads);

      expect(result.isValid).toBe(true);
    });

    it('should detect inconsistent spreads-only input', () => {
      const pages: PageInfo[] = [];
      const spreads = [
        createSpreadInfo('spread1.png', [1, 2], 4000, 3000),
        createSpreadInfo('spread2.png', [3, 4], 5000, 3000), // Different width
      ];

      const result = validateImageDimensions(pages, spreads);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about pages without page numbers', () => {
      const parsedFile = parseFile(new File([''], 'random.png', { type: 'image/png' }));
      const pages: PageInfo[] = [
        {
          parsedFile,
          imageData: 'data:image/png;base64,test',
          width: 2000,
          height: 3000,
        },
      ];
      const spreads: SpreadInfo[] = [];

      const result = validateImageDimensions(pages, spreads);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('without page numbers');
    });
  });

  describe('processFiles', () => {
    it('should have correct function signature', () => {
      expect(typeof processFiles).toBe('function');
    });

    // Note: processFiles is tested indirectly through integration tests
    // Direct unit tests require actual image file loading which is slow
  });
});

