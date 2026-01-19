import { describe, it, expect } from 'vitest';
import { COMPRESSION_PRESETS, estimateUncompressedSize, estimateCompressedSize, formatFileSize, buildReadingOrderPages } from './pdfGenerator';
import type { BookletPageInfo, SpreadInfo, ParsedFile, PDFGenerationOptions } from '../types';
import { DEFAULT_PDF_OPTIONS, DEFAULT_BLEED_CONFIG } from '../types';

// Helper to create a mock parsed file
const createParsedFile = (pageNumber: number | null, name: string): ParsedFile => ({
  file: new File([], name),
  pageNumber,
  isSpread: false,
  displayName: name,
  originalName: name,
});

// Helper to create a mock booklet page
const createPage = (pageNumber: number, dataSize: number = 1000): BookletPageInfo => ({
  parsedFile: createParsedFile(pageNumber, `page_${pageNumber}.png`),
  imageData: 'data:image/png;base64,' + 'A'.repeat(dataSize),
  width: 1000,
  height: 1500,
});

// Helper to create a mock spread
const createSpread = (pages: [number, number], dataSize: number = 2000): SpreadInfo => ({
  parsedFile: {
    ...createParsedFile(pages[0], `spread_${pages[0]}_${pages[1]}.png`),
    isSpread: true,
    spreadPages: pages,
  },
  imageData: 'data:image/png;base64,' + 'A'.repeat(dataSize),
  width: 2000,
  height: 1500,
  pages,
});

describe('COMPRESSION_PRESETS', () => {
  it('has all expected presets', () => {
    expect(COMPRESSION_PRESETS.none).toBeDefined();
    expect(COMPRESSION_PRESETS.light).toBeDefined();
    expect(COMPRESSION_PRESETS.medium).toBeDefined();
    expect(COMPRESSION_PRESETS.maximum).toBeDefined();
    expect(COMPRESSION_PRESETS.custom).toBeDefined();
  });

  it('none preset has no compression', () => {
    expect(COMPRESSION_PRESETS.none.convertToJpeg).toBe(false);
    expect(COMPRESSION_PRESETS.none.jpegQuality).toBe(1);
    expect(COMPRESSION_PRESETS.none.reduceResolution).toBe(false);
    expect(COMPRESSION_PRESETS.none.resolutionScale).toBe(1);
  });

  it('maximum preset has highest compression', () => {
    expect(COMPRESSION_PRESETS.maximum.convertToJpeg).toBe(true);
    expect(COMPRESSION_PRESETS.maximum.jpegQuality).toBeLessThan(1);
    expect(COMPRESSION_PRESETS.maximum.reduceResolution).toBe(true);
    expect(COMPRESSION_PRESETS.maximum.resolutionScale).toBeLessThan(1);
  });
});

describe('estimateUncompressedSize', () => {
  it('returns PDF overhead for empty pages/spreads', () => {
    const size = estimateUncompressedSize([], []);
    expect(size).toBe(5000); // PDF overhead only
  });

  it('estimates size based on image data length', () => {
    const pages = [createPage(1, 1000)];
    const size = estimateUncompressedSize(pages, []);
    expect(size).toBeGreaterThan(5000);
  });

  it('includes spread sizes in estimate', () => {
    const spreads = [createSpread([2, 3], 2000)];
    const sizeWithSpreads = estimateUncompressedSize([], spreads);
    expect(sizeWithSpreads).toBeGreaterThan(5000);
  });
});

describe('estimateCompressedSize', () => {
  it('returns uncompressed size for none preset', () => {
    const uncompressed = 100000;
    const options: PDFGenerationOptions = {
      ...DEFAULT_PDF_OPTIONS,
      compressionPreset: 'none',
    };
    const compressed = estimateCompressedSize(uncompressed, options);
    // With no compression, should be close to original
    expect(compressed).toBeCloseTo(uncompressed, -2);
  });

  it('reduces size significantly for maximum preset', () => {
    const uncompressed = 100000;
    const options: PDFGenerationOptions = {
      ...DEFAULT_PDF_OPTIONS,
      compressionPreset: 'maximum',
    };
    const compressed = estimateCompressedSize(uncompressed, options);
    expect(compressed).toBeLessThan(uncompressed * 0.5);
  });
});

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(500)).toMatch(/500.*B/);
  });

  it('formats kilobytes correctly', () => {
    expect(formatFileSize(1024)).toMatch(/1.*KB/);
    expect(formatFileSize(2048)).toMatch(/2.*KB/);
  });

  it('formats megabytes correctly', () => {
    expect(formatFileSize(1024 * 1024)).toMatch(/1.*MB/);
    expect(formatFileSize(1024 * 1024 * 5.5)).toMatch(/5.*MB/);
  });
});

describe('PDFGenerationOptions type', () => {
  it('DEFAULT_PDF_OPTIONS has required fields', () => {
    expect(DEFAULT_PDF_OPTIONS.compressionPreset).toBeDefined();
    expect(DEFAULT_PDF_OPTIONS.jpegQuality).toBeDefined();
    expect(DEFAULT_PDF_OPTIONS.resolutionScale).toBeDefined();
    expect(DEFAULT_PDF_OPTIONS.exportFormat).toBeDefined();
  });

  it('DEFAULT_BLEED_CONFIG has Mixam standard values', () => {
    expect(DEFAULT_BLEED_CONFIG.top).toBe(0.125);
    expect(DEFAULT_BLEED_CONFIG.unit).toBe('in');
    expect(DEFAULT_BLEED_CONFIG.quietArea).toBe(0.25);
  });
});

describe('buildReadingOrderPages', () => {
  it('returns pages in correct reading order', () => {
    const pages = [
      createPage(0),   // Front cover
      createPage(-0.5), // Inner front
      createPage(1),    // Page 1
      createPage(2),    // Page 2
      createPage(-1),   // Inner back
      createPage(-2),   // Back cover
    ];
    
    const result = buildReadingOrderPages(pages, []);
    
    // Extract page numbers in order
    const pageNumbers = result.map(p => p.pageNumber);
    
    // Verify correct order: front (0), inner front (-0.5), page 1, page 2, inner back (-1), back cover (-2)
    expect(pageNumbers[0]).toBe(0);        // Front cover
    expect(pageNumbers[1]).toBe(-0.5);     // Inner front
    expect(pageNumbers[2]).toBe(1);        // Page 1
    expect(pageNumbers[3]).toBe(2);        // Page 2
    expect(pageNumbers[4]).toBe(-1);       // Inner back
    expect(pageNumbers[5]).toBe(-2);       // Back cover
  });

  it('includes blank pages for missing page numbers', () => {
    // Only upload front cover and page 2 - should include blanks for inner front, page 1, inner back, back
    const pages = [
      createPage(0),    // Front cover
      createPage(2),    // Page 2 (skipping inner front and page 1)
    ];
    
    const result = buildReadingOrderPages(pages, []);
    
    // Should have: front cover, inner front (blank), page 1 (blank), page 2, inner back (blank), back cover (blank)
    expect(result.length).toBe(6);
    
    // Check for blanks (empty imageData)
    const innerFront = result.find(p => p.pageNumber === -0.5);
    expect(innerFront?.imageData).toBe(''); // Should be blank
    
    const page1 = result.find(p => p.pageNumber === 1);
    expect(page1?.imageData).toBe(''); // Should be blank
    
    const page2 = result.find(p => p.pageNumber === 2);
    expect(page2?.imageData).toBeTruthy(); // Should have data
  });

  it('handles spreads by adding them in correct position', () => {
    const pages = [
      createPage(0),    // Front cover
      createPage(-2),   // Back cover
    ];
    const spreads = [
      createSpread([2, 3]),  // Spread for pages 2-3
    ];
    
    const result = buildReadingOrderPages(pages, spreads);
    
    // Pages 2 and 3 should be skipped (they're in the spread)
    const page2 = result.find(p => p.pageNumber === 2 && !p.label.includes('Spread'));
    expect(page2).toBeUndefined();
    
    // Spread should be present
    const spread = result.find(p => p.label.includes('Spread'));
    expect(spread).toBeDefined();
    expect(spread?.imageData).toBeTruthy();
  });

  it('sorts scrambled input pages into correct reading order', () => {
    // Pages uploaded in random order
    const pages = [
      createPage(2),     // Page 2
      createPage(-2),    // Back cover
      createPage(-0.5),  // Inner front
      createPage(1),     // Page 1
      createPage(0),     // Front cover
      createPage(-1),    // Inner back
    ];
    
    const result = buildReadingOrderPages(pages, []);
    const pageNumbers = result.map(p => p.pageNumber);
    
    // Should be sorted into correct reading order
    expect(pageNumbers).toEqual([0, -0.5, 1, 2, -1, -2]);
  });
});
