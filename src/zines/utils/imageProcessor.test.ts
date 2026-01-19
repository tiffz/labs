import { describe, it, expect } from 'vitest';
import { validateImageDimensions } from './imageProcessor';
import type { BookletPageInfo, SpreadInfo, ParsedFile } from '../types';

// Helper to create a mock parsed file
const createParsedFile = (pageNumber: number | null, name: string): ParsedFile => ({
  file: new File([], name),
  pageNumber,
  isSpread: false,
  displayName: name,
  originalName: name,
});

// Helper to create a mock booklet page
const createPage = (pageNumber: number, width = 1000, height = 1500): BookletPageInfo => ({
  parsedFile: createParsedFile(pageNumber, `page_${pageNumber}.png`),
  imageData: `data:image/png;base64,${pageNumber}`,
  width,
  height,
});

// Helper to create a mock spread
const createSpread = (pages: [number, number], width = 2000, height = 1500): SpreadInfo => ({
  parsedFile: {
    ...createParsedFile(pages[0], `spread_${pages[0]}_${pages[1]}.png`),
    isSpread: true,
    spreadPages: pages,
  },
  imageData: `data:image/png;base64,spread_${pages[0]}_${pages[1]}`,
  width,
  height,
  pages,
});

describe('validateImageDimensions', () => {
  describe('basic validation', () => {
    it('returns invalid when no pages or spreads', () => {
      const result = validateImageDimensions([], []);
      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('No pages uploaded yet');
    });

    it('returns valid for single page', () => {
      const pages = [createPage(1)];
      const result = validateImageDimensions(pages, []);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns valid for multiple pages with same dimensions', () => {
      const pages = [
        createPage(1, 1000, 1500),
        createPage(2, 1000, 1500),
        createPage(3, 1000, 1500),
      ];
      const result = validateImageDimensions(pages, []);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns valid with warnings for pages with different dimensions', () => {
      const pages = [
        createPage(1, 1000, 1500),
        createPage(2, 800, 1200), // Different dimensions
        createPage(3, 1000, 1500),
      ];
      const result = validateImageDimensions(pages, []);
      // Should still be valid (dimension mismatches are warnings now)
      expect(result.isValid).toBe(true);
      // Should have warning about the different dimensions
      expect(result.warnings.some(w => w.includes('different dimensions'))).toBe(true);
    });
  });

  describe('spread validation', () => {
    it('returns valid for spreads only', () => {
      const spreads = [createSpread([2, 3], 2000, 1500)];
      const result = validateImageDimensions([], spreads);
      expect(result.isValid).toBe(true);
    });

    it('returns valid with warnings for spreads with mismatched dimensions', () => {
      const spreads = [
        createSpread([2, 3], 2000, 1500),
        createSpread([4, 5], 1800, 1400), // Different dimensions
      ];
      const result = validateImageDimensions([], spreads);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('different dimensions'))).toBe(true);
    });

    it('validates spread width matches 2x page width', () => {
      const pages = [createPage(1, 1000, 1500)];
      const spreads = [createSpread([2, 3], 2000, 1500)]; // Correct: 2 * 1000 = 2000
      const result = validateImageDimensions(pages, spreads);
      expect(result.isValid).toBe(true);
      // Should not have warnings about spread dimensions when they match
      const spreadWarnings = result.warnings.filter(w => w.includes('Spread'));
      expect(spreadWarnings).toHaveLength(0);
    });
  });

  describe('page number warnings', () => {
    it('warns about pages without page numbers', () => {
      const pages = [
        createPage(1),
        { ...createPage(0), parsedFile: createParsedFile(null, 'unnamed.png') },
      ];
      const result = validateImageDimensions(pages, []);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('without page numbers'))).toBe(true);
    });
  });
});

describe('dimension mismatch handling', () => {
  it('uses most common dimensions as standard', () => {
    const pages = [
      createPage(1, 1000, 1500),
      createPage(2, 1000, 1500),
      createPage(3, 1000, 1500),
      createPage(4, 800, 1200), // Different
    ];
    const result = validateImageDimensions(pages, []);
    
    // Should be valid since dimension mismatches are now warnings
    expect(result.isValid).toBe(true);
    
    // The warning should mention the different dimensions
    expect(result.warnings.some(w => 
      w.includes('800×1200') || w.includes('800x1200')
    )).toBe(true);
  });
});
