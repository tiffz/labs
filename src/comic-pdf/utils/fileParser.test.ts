import { describe, it, expect } from 'vitest';
import {
  extractPageNumber,
  detectSpread,
  parseFile,
  sortFilesByPageOrder,
  parseAndSortFiles,
} from './fileParser';

describe('fileParser', () => {
  describe('extractPageNumber', () => {
    it('should extract page number from numbered filenames', () => {
      expect(extractPageNumber('file1.pdf')).toBe(1);
      expect(extractPageNumber('page2.jpg')).toBe(2);
      expect(extractPageNumber('page10.png')).toBe(10);
      expect(extractPageNumber('comic-page-15.jpg')).toBe(15);
    });

    it('should handle flexible naming patterns', () => {
      expect(extractPageNumber('page1.png')).toBe(1);
      expect(extractPageNumber('page_1.png')).toBe(1);
      expect(extractPageNumber('1.png')).toBe(1);
      expect(extractPageNumber('page_10.jpg')).toBe(10);
    });

    it('should handle special keywords', () => {
      expect(extractPageNumber('front.pdf')).toBe(0);
      expect(extractPageNumber('frontcover.jpg')).toBe(0);
      expect(extractPageNumber('back.pdf')).toBe(-2);
      expect(extractPageNumber('backcover.jpg')).toBe(-2);
      expect(extractPageNumber('rear.pdf')).toBe(-2);
      expect(extractPageNumber('last.pdf')).toBe(-3);
      expect(extractPageNumber('inner.pdf')).toBe(-1);
    });

    it('should handle compound keywords', () => {
      expect(extractPageNumber('innerfront.png')).toBe(-0.5);
      expect(extractPageNumber('inner-front.png')).toBe(-0.5);
      expect(extractPageNumber('innerback.png')).toBe(-1);
      expect(extractPageNumber('inner-back.png')).toBe(-1);
    });

    it('should return null for files without page numbers', () => {
      expect(extractPageNumber('random-file.pdf')).toBeNull();
      expect(extractPageNumber('cover.jpg')).toBeNull();
    });
  });

  describe('detectSpread', () => {
    it('should detect hyphenated spreads', () => {
      const result1 = detectSpread('page14-15.jpg');
      expect(result1.isSpread).toBe(true);
      expect(result1.pages).toEqual([14, 15]);

      const result2 = detectSpread('14-15.jpg');
      expect(result2.isSpread).toBe(true);
      expect(result2.pages).toEqual([14, 15]);

      const result3 = detectSpread('page1-2.png');
      expect(result3.isSpread).toBe(true);
      expect(result3.pages).toEqual([1, 2]);

      const result4 = detectSpread('1-2.png');
      expect(result4.isSpread).toBe(true);
      expect(result4.pages).toEqual([1, 2]);

      const result5 = detectSpread('page_1-2.png');
      expect(result5.isSpread).toBe(true);
      expect(result5.pages).toEqual([1, 2]);
    });

    it('should detect number-keyword spreads', () => {
      const result1 = detectSpread('page12-innercover.png');
      expect(result1.isSpread).toBe(true);
      expect(result1.pages).toEqual([12, -1]);

      const result2 = detectSpread('page12-inner.png');
      expect(result2.isSpread).toBe(true);
      expect(result2.pages).toEqual([12, -1]);

      const result3 = detectSpread('12-innerback.png');
      expect(result3.isSpread).toBe(true);
      expect(result3.pages).toEqual([12, -1]);

      const result4 = detectSpread('page1-innerfront.png');
      expect(result4.isSpread).toBe(true);
      expect(result4.pages).toEqual([-0.5, 1]);
    });

    it('should detect keyword-number spreads', () => {
      const result1 = detectSpread('innercover-12.png');
      expect(result1.isSpread).toBe(true);
      expect(result1.pages).toEqual([12, -1]);
    });

    it('should detect keyword-number spreads with underscores in keywords', () => {
      const result1 = detectSpread('Inner_Front-1.png');
      expect(result1.isSpread).toBe(true);
      expect(result1.pages).toEqual([-0.5, 1]);

      const result2 = detectSpread('inner_back-12.png');
      expect(result2.isSpread).toBe(true);
      expect(result2.pages).toEqual([12, -1]);

      const result3 = detectSpread('Inner_Cover-10.png');
      expect(result3.isSpread).toBe(true);
      expect(result3.pages).toEqual([10, -1]);
    });

    it('should detect number-keyword spreads with underscores in keywords', () => {
      const result1 = detectSpread('Page_12-Inner_Back.png');
      expect(result1.isSpread).toBe(true);
      expect(result1.pages).toEqual([12, -1]);

      const result2 = detectSpread('page12-inner_cover.png');
      expect(result2.isSpread).toBe(true);
      expect(result2.pages).toEqual([12, -1]);

      const result3 = detectSpread('1-inner_front.png');
      expect(result3.isSpread).toBe(true);
      expect(result3.pages).toEqual([-0.5, 1]);
    });

    it('should detect keyword-keyword spreads', () => {
      const result1 = detectSpread('outer_back-outer_front.png');
      expect(result1.isSpread).toBe(true);
      expect(result1.pages).toEqual([-2, 0]);

      const result2 = detectSpread('back-front.png');
      expect(result2.isSpread).toBe(true);
      expect(result2.pages).toEqual([-2, 0]);
    });

    it('should detect concatenated spreads', () => {
      const result1 = detectSpread('page14page15.jpg');
      expect(result1.isSpread).toBe(true);
      expect(result1.pages).toEqual([14, 15]);

      const result2 = detectSpread('1415.jpg');
      expect(result2.isSpread).toBe(true);
      expect(result2.pages).toEqual([14, 15]);
    });

    it('should not detect non-consecutive numbers as spreads', () => {
      const result1 = detectSpread('page14-16.jpg');
      expect(result1.isSpread).toBe(false);

      const result2 = detectSpread('page14page16.jpg');
      expect(result2.isSpread).toBe(false);
    });

    it('should not detect single pages as spreads', () => {
      const result = detectSpread('page14.jpg');
      expect(result.isSpread).toBe(false);
    });
  });

  describe('parseFile', () => {
    it('should parse regular page files', () => {
      const file = new File([''], 'page1.jpg', { type: 'image/jpeg' });
      const parsed = parseFile(file);
      
      expect(parsed.pageNumber).toBe(1);
      expect(parsed.isSpread).toBe(false);
      expect(parsed.originalName).toBe('page1.jpg');
    });

    it('should parse spread files', () => {
      const file = new File([''], 'page14-15.jpg', { type: 'image/jpeg' });
      const parsed = parseFile(file);
      
      expect(parsed.isSpread).toBe(true);
      expect(parsed.spreadPages).toEqual([14, 15]);
    });

    it('should parse number-keyword spreads', () => {
      const file = new File([''], 'Page12-InnerCover.png', { type: 'image/png' });
      const parsed = parseFile(file);
      
      expect(parsed.isSpread).toBe(true);
      expect(parsed.spreadPages).toEqual([12, -1]);
    });
  });

  describe('sortFilesByPageOrder', () => {
    it('should sort files by page number', () => {
      const files = [
        parseFile(new File([''], 'page3.jpg', { type: 'image/jpeg' })),
        parseFile(new File([''], 'page1.jpg', { type: 'image/jpeg' })),
        parseFile(new File([''], 'page2.jpg', { type: 'image/jpeg' })),
      ];
      
      const sorted = sortFilesByPageOrder(files);
      expect(sorted[0].pageNumber).toBe(1);
      expect(sorted[1].pageNumber).toBe(2);
      expect(sorted[2].pageNumber).toBe(3);
    });

    it('should handle spreads correctly', () => {
      const files = [
        parseFile(new File([''], 'page14-15.jpg', { type: 'image/jpeg' })),
        parseFile(new File([''], 'page1.jpg', { type: 'image/jpeg' })),
        parseFile(new File([''], 'page2.jpg', { type: 'image/jpeg' })),
      ];
      
      const sorted = sortFilesByPageOrder(files);
      expect(sorted[0].pageNumber).toBe(1);
      expect(sorted[1].pageNumber).toBe(2);
      expect(sorted[2].isSpread).toBe(true);
      expect(sorted[2].spreadPages?.[0]).toBe(14);
    });

    it('should place front cover first', () => {
      const files = [
        parseFile(new File([''], 'page2.jpg', { type: 'image/jpeg' })),
        parseFile(new File([''], 'front.jpg', { type: 'image/jpeg' })),
        parseFile(new File([''], 'page1.jpg', { type: 'image/jpeg' })),
      ];
      
      const sorted = sortFilesByPageOrder(files);
      expect(sorted[0].pageNumber).toBe(0); // front
      expect(sorted[1].pageNumber).toBe(1);
      expect(sorted[2].pageNumber).toBe(2);
    });
  });

  describe('parseAndSortFiles', () => {
    it('should parse and sort multiple files', () => {
      const files = [
        new File([''], 'page3.jpg', { type: 'image/jpeg' }),
        new File([''], 'page1.jpg', { type: 'image/jpeg' }),
        new File([''], 'page2.jpg', { type: 'image/jpeg' }),
      ];
      
      const parsed = parseAndSortFiles(files);
      expect(parsed.length).toBe(3);
      expect(parsed[0].pageNumber).toBe(1);
      expect(parsed[1].pageNumber).toBe(2);
      expect(parsed[2].pageNumber).toBe(3);
    });
  });
});
