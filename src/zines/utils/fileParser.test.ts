import { describe, it, expect } from 'vitest';
import { extractPageNumber, detectSpread, sortFilesByPageOrder, parseAndSortFiles } from './fileParser';

describe('extractPageNumber', () => {
  describe('numbered pages', () => {
    it('extracts page number from "page1.png"', () => {
      expect(extractPageNumber('page1.png')).toBe(1);
    });

    it('extracts page number from "page_1.png"', () => {
      expect(extractPageNumber('page_1.png')).toBe(1);
    });

    it('extracts page number from "Page_12.png"', () => {
      expect(extractPageNumber('Page_12.png')).toBe(12);
    });

    it('extracts page number from "1.png"', () => {
      expect(extractPageNumber('1.png')).toBe(1);
    });

    it('extracts page number from "file1.pdf"', () => {
      expect(extractPageNumber('file1.pdf')).toBe(1);
    });

    it('extracts page number from "page10.jpg"', () => {
      expect(extractPageNumber('page10.jpg')).toBe(10);
    });
  });

  describe('special keywords', () => {
    it('returns 0 for front cover', () => {
      expect(extractPageNumber('front.png')).toBe(0);
      expect(extractPageNumber('front_cover.png')).toBe(0);
      expect(extractPageNumber('frontcover.png')).toBe(0);
    });

    it('returns -2 for back cover', () => {
      expect(extractPageNumber('back.png')).toBe(-2);
      expect(extractPageNumber('back_cover.png')).toBe(-2);
      expect(extractPageNumber('backcover.png')).toBe(-2);
    });

    it('returns -2 for rear cover', () => {
      expect(extractPageNumber('rear.png')).toBe(-2);
    });

    it('returns -0.5 for inner front cover', () => {
      expect(extractPageNumber('inner_front.png')).toBe(-0.5);
      expect(extractPageNumber('Inner_Front.png')).toBe(-0.5);
      expect(extractPageNumber('innerfront.png')).toBe(-0.5);
    });

    it('returns -1 for inner back cover', () => {
      expect(extractPageNumber('inner_back.png')).toBe(-1);
      expect(extractPageNumber('Inner_Back.png')).toBe(-1);
      expect(extractPageNumber('innerback.png')).toBe(-1);
    });
  });

  describe('edge cases', () => {
    it('returns null for files without numbers or keywords', () => {
      expect(extractPageNumber('random.png')).toBeNull();
      expect(extractPageNumber('artwork.jpg')).toBeNull();
    });

    it('handles mixed case', () => {
      expect(extractPageNumber('PAGE1.PNG')).toBe(1);
      expect(extractPageNumber('FRONT.jpg')).toBe(0);
    });
  });
});

describe('detectSpread', () => {
  describe('hyphenated spreads', () => {
    it('detects "page14-15.jpg" as spread', () => {
      const result = detectSpread('page14-15.jpg');
      expect(result.isSpread).toBe(true);
      expect(result.pages).toEqual([14, 15]);
    });

    it('detects "1-2.png" as spread', () => {
      const result = detectSpread('1-2.png');
      expect(result.isSpread).toBe(true);
      expect(result.pages).toEqual([1, 2]);
    });

    it('detects "page_1-2.png" as spread', () => {
      const result = detectSpread('page_1-2.png');
      expect(result.isSpread).toBe(true);
      expect(result.pages).toEqual([1, 2]);
    });
  });

  describe('cover spreads', () => {
    it('detects "back-front.jpg" as outer cover spread', () => {
      const result = detectSpread('back-front.jpg');
      expect(result.isSpread).toBe(true);
      expect(result.pages).toEqual([-2, 0]);
    });

    it('detects "outer_back-outer_front.png" as outer cover spread', () => {
      const result = detectSpread('outer_back-outer_front.png');
      expect(result.isSpread).toBe(true);
      expect(result.pages).toEqual([-2, 0]);
    });
  });

  describe('number-keyword spreads', () => {
    it('detects "page12-innercover.jpg" as spread', () => {
      const result = detectSpread('page12-innercover.jpg');
      expect(result.isSpread).toBe(true);
      expect(result.pages).toEqual([12, -1]);
    });
  });

  describe('non-spreads', () => {
    it('does not detect "Page_12.png" as spread', () => {
      const result = detectSpread('Page_12.png');
      expect(result.isSpread).toBe(false);
    });

    it('does not detect single page numbers as spreads', () => {
      const result = detectSpread('page1.png');
      expect(result.isSpread).toBe(false);
    });
  });
});

describe('sortFilesByPageOrder', () => {
  it('sorts pages in correct reading order', () => {
    const files = [
      { file: new File([], 'page3.png'), pageNumber: 3, isSpread: false, displayName: 'page3.png', originalName: 'page3.png' },
      { file: new File([], 'front.png'), pageNumber: 0, isSpread: false, displayName: 'front.png', originalName: 'front.png' },
      { file: new File([], 'page1.png'), pageNumber: 1, isSpread: false, displayName: 'page1.png', originalName: 'page1.png' },
      { file: new File([], 'back.png'), pageNumber: -2, isSpread: false, displayName: 'back.png', originalName: 'back.png' },
      { file: new File([], 'page2.png'), pageNumber: 2, isSpread: false, displayName: 'page2.png', originalName: 'page2.png' },
    ];

    const sorted = sortFilesByPageOrder(files);
    
    expect(sorted[0].pageNumber).toBe(0);  // Front cover first
    expect(sorted[1].pageNumber).toBe(1);  // Then page 1
    expect(sorted[2].pageNumber).toBe(2);  // Then page 2
    expect(sorted[3].pageNumber).toBe(3);  // Then page 3
    expect(sorted[4].pageNumber).toBe(-2); // Back cover last
  });

  it('handles inner covers correctly', () => {
    // The sort function places negative page numbers AFTER positive ones
    // This is intentional as inner covers appear after regular pages in the book
    const files = [
      { file: new File([], 'page1.png'), pageNumber: 1, isSpread: false, displayName: 'page1.png', originalName: 'page1.png' },
      { file: new File([], 'inner_front.png'), pageNumber: -0.5, isSpread: false, displayName: 'inner_front.png', originalName: 'inner_front.png' },
      { file: new File([], 'inner_back.png'), pageNumber: -1, isSpread: false, displayName: 'inner_back.png', originalName: 'inner_back.png' },
      { file: new File([], 'front.png'), pageNumber: 0, isSpread: false, displayName: 'front.png', originalName: 'front.png' },
    ];

    const sorted = sortFilesByPageOrder(files);
    
    expect(sorted[0].pageNumber).toBe(0);    // Front cover (0 is not negative)
    expect(sorted[1].pageNumber).toBe(1);    // Page 1
    // Negative values come after positives, sorted among themselves
    expect(sorted[2].pageNumber).toBe(-1);   // Inner back (more negative)
    expect(sorted[3].pageNumber).toBe(-0.5); // Inner front (less negative)
  });

  it('handles files without page numbers', () => {
    const files = [
      { file: new File([], 'page1.png'), pageNumber: 1, isSpread: false, displayName: 'page1.png', originalName: 'page1.png' },
      { file: new File([], 'random.png'), pageNumber: null, isSpread: false, displayName: 'random.png', originalName: 'random.png' },
    ];

    const sorted = sortFilesByPageOrder(files);
    
    expect(sorted[0].pageNumber).toBe(1);    // Named page first
    expect(sorted[1].pageNumber).toBeNull(); // Unknown last
  });
});

describe('parseAndSortFiles', () => {
  it('parses and sorts multiple files correctly', () => {
    const files = [
      new File([], 'page2.png'),
      new File([], 'front.png'),
      new File([], 'page1.png'),
    ];

    const result = parseAndSortFiles(files);
    
    expect(result).toHaveLength(3);
    expect(result[0].pageNumber).toBe(0);  // front
    expect(result[1].pageNumber).toBe(1);  // page1
    expect(result[2].pageNumber).toBe(2);  // page2
  });

  it('correctly identifies spreads', () => {
    const files = [
      new File([], 'page1-2.png'),
      new File([], 'page3.png'),
    ];

    const result = parseAndSortFiles(files);
    
    expect(result[0].isSpread).toBe(true);
    expect(result[0].spreadPages).toEqual([1, 2]);
    expect(result[1].isSpread).toBe(false);
  });
});
