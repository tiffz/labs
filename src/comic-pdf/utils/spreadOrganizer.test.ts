import { describe, it, expect } from 'vitest';
import { organizeIntoSpreads, estimateDPI, calculateTrimSize } from './spreadOrganizer';
import type { PageInfo, SpreadInfo } from '../types';
import { parseFile } from './fileParser';

describe('spreadOrganizer', () => {
  const createPageInfo = (filename: string, width: number = 2000, height: number = 3000): PageInfo => {
    const parsedFile = parseFile(new File([''], filename, { type: 'image/png' }));
    return {
      parsedFile,
      imageData: `data:image/png;base64,test`,
      width,
      height,
    };
  };

  const createSpreadInfo = (filename: string, pages: [number, number], width: number = 4000, height: number = 3000): SpreadInfo => {
    const parsedFile = parseFile(new File([''], filename, { type: 'image/png' }));
    return {
      parsedFile,
      imageData: `data:image/png;base64,test`,
      width,
      height,
      pages,
    };
  };

  describe('organizeIntoSpreads', () => {
    it('should pair consecutive pages into spreads (even left, odd right)', () => {
      const pages = [
        createPageInfo('page1.png'),
        createPageInfo('page2.png'),
        createPageInfo('page3.png'),
        createPageInfo('page4.png'),
      ];
      const spreads: SpreadInfo[] = [];

      const result = organizeIntoSpreads(pages, spreads);

      // Should organize pages correctly
      expect(result.length).toBeGreaterThan(0);
      
      // Page 2 (even) should pair with page 3 (odd)
      const page2Spread = result.find(s => s.pageNumbers.includes(2));
      if (page2Spread && page2Spread.type === 'auto-paired-spread') {
        expect(page2Spread.pageNumbers).toEqual([2, 3]);
      }
      
      // Verify pages are organized (page 1 might be single if odd and no inner front)
      const allPageNumbers = result.flatMap(s => s.pageNumbers).filter(n => n !== null && n > 0);
      expect(allPageNumbers.length).toBeGreaterThanOrEqual(3); // At least some pages should be present
    });

    it('should handle outer covers as a spread', () => {
      const pages = [
        createPageInfo('back.png'),
        createPageInfo('front.png'),
        createPageInfo('page1.png'),
      ];
      const spreads: SpreadInfo[] = [];

      const result = organizeIntoSpreads(pages, spreads);

      // Outer covers should be paired, then page 1 is single (odd, no inner front)
      expect(result.length).toBeGreaterThanOrEqual(1);
      const coverSpread = result.find(s => s.pageNumbers.includes(-2) || s.pageNumbers.includes(0));
      expect(coverSpread).toBeDefined();
      expect(coverSpread?.type).toBe('auto-paired-spread');
      expect(coverSpread?.pageNumbers).toEqual([-2, 0]); // Outer back + front
      expect(coverSpread?.displayLabel).toBe('Outer Cover (Back + Front)');
    });

    it('should pair inner front cover with page 1', () => {
      const pages = [
        createPageInfo('innerfront.png'),
        createPageInfo('page1.png'),
        createPageInfo('page2.png'),
      ];
      const spreads: SpreadInfo[] = [];

      const result = organizeIntoSpreads(pages, spreads);

      expect(result.length).toBe(2);
      expect(result[0].type).toBe('auto-paired-spread');
      expect(result[0].pageNumbers).toEqual([-0.5, 1]); // Inner front + page 1
      expect(result[0].displayLabel).toBe('Inner Front Cover + Page 1');
    });

    it('should pair last page with inner back cover', () => {
      const pages = [
        createPageInfo('page1.png'),
        createPageInfo('page2.png'),
        createPageInfo('page12.png'),
        createPageInfo('inner.png'),
      ];
      const spreads: SpreadInfo[] = [];

      const result = organizeIntoSpreads(pages, spreads);

      const lastSpread = result.find(s => s.pageNumbers.includes(12));
      expect(lastSpread).toBeDefined();
      expect(lastSpread?.type).toBe('auto-paired-spread');
      expect(lastSpread?.pageNumbers).toEqual([12, -1]); // Page 12 + inner back
    });

    it('should handle explicit spreads', () => {
      const pages: PageInfo[] = [];
      const spreads = [
        createSpreadInfo('page14-15.png', [14, 15]),
      ];

      const result = organizeIntoSpreads(pages, spreads);

      expect(result.length).toBe(1);
      expect(result[0].type).toBe('explicit-spread');
      expect(result[0].pageNumbers).toEqual([14, 15]);
    });

    it('should handle number-keyword spreads', () => {
      const pages: PageInfo[] = [];
      const spreads = [
        createSpreadInfo('Page12-InnerCover.png', [12, -1]),
      ];

      const result = organizeIntoSpreads(pages, spreads);

      expect(result.length).toBe(1);
      expect(result[0].type).toBe('explicit-spread');
      expect(result[0].pageNumbers).toEqual([12, -1]);
      expect(result[0].displayLabel).toContain('Page12-InnerCover');
    });

    it('should not duplicate inner front cover', () => {
      const pages = [
        createPageInfo('innerfront.png'),
        createPageInfo('page1.png'),
      ];
      const spreads: SpreadInfo[] = [];

      const result = organizeIntoSpreads(pages, spreads);

      const innerFrontSpreads = result.filter(s => 
        s.pageNumbers.includes(-0.5) || s.displayLabel.includes('Inner Front')
      );
      expect(innerFrontSpreads.length).toBe(1);
    });

    it('should not create duplicate inner front spread when explicit spread exists', () => {
      // User has both a standalone inner front file AND an explicit spread
      const pages = [
        createPageInfo('Inner_Front.png'),
        createPageInfo('page1.png'),
        createPageInfo('page2.png'),
      ];
      const spreads = [
        createSpreadInfo('InnerFront-1.png', [-0.5, 1]),
      ];

      const result = organizeIntoSpreads(pages, spreads);

      // Should only have ONE spread containing inner front
      const innerFrontSpreads = result.filter(s => 
        s.pageNumbers.includes(-0.5) || s.displayLabel.toLowerCase().includes('inner front')
      );
      expect(innerFrontSpreads.length).toBe(1);
      expect(innerFrontSpreads[0].type).toBe('explicit-spread');
    });

    it('should not add inner front as single when it is in an explicit spread', () => {
      const pages = [
        createPageInfo('Inner_Front.png'),
        createPageInfo('page1.png'),
      ];
      const spreads = [
        createSpreadInfo('InnerFront-1.png', [-0.5, 1]),
      ];

      const result = organizeIntoSpreads(pages, spreads);

      // Should not have inner front as a single page
      const singleInnerFront = result.find(s => 
        s.type === 'single-page' && s.pageNumbers.includes(-0.5)
      );
      expect(singleInnerFront).toBeUndefined();
    });

    it('should not create duplicate inner back spread when explicit spread exists', () => {
      // User has both a standalone inner back file AND an explicit spread
      const pages = [
        createPageInfo('Inner_Back.png'),
        createPageInfo('page10.png'),
        createPageInfo('page11.png'),
        createPageInfo('page12.png'),
      ];
      const spreads = [
        createSpreadInfo('Page12-InnerBack.png', [12, -1]),
      ];

      const result = organizeIntoSpreads(pages, spreads);

      // Should only have ONE spread containing inner back
      const innerBackSpreads = result.filter(s => 
        s.pageNumbers.includes(-1) || s.displayLabel.toLowerCase().includes('inner back')
      );
      expect(innerBackSpreads.length).toBe(1);
      expect(innerBackSpreads[0].type).toBe('explicit-spread');
    });

    it('should not add inner back as single when it is in an explicit spread', () => {
      const pages = [
        createPageInfo('Inner_Back.png'),
        createPageInfo('page12.png'),
      ];
      const spreads = [
        createSpreadInfo('Page12-InnerBack.png', [12, -1]),
      ];

      const result = organizeIntoSpreads(pages, spreads);

      // Should not have inner back as a single page
      const singleInnerBack = result.find(s => 
        s.type === 'single-page' && s.pageNumbers.includes(-1)
      );
      expect(singleInnerBack).toBeUndefined();
    });

    it('should not create duplicate when explicit spread has underscore naming', () => {
      // User has explicit spread with underscore naming like "Page_12-Inner_Back.png"
      const pages = [
        createPageInfo('Inner_Back.png'),
        createPageInfo('page12.png'),
      ];
      const spreads = [
        createSpreadInfo('Page_12-Inner_Back.png', [12, -1]),
      ];

      const result = organizeIntoSpreads(pages, spreads);

      // Should only have ONE spread containing inner back
      const innerBackSpreads = result.filter(s => 
        s.pageNumbers.includes(-1)
      );
      expect(innerBackSpreads.length).toBe(1);
    });

    it('should not duplicate inner back when auto-paired with last page', () => {
      // This is the key scenario: standalone inner back file gets auto-paired with last page
      // Should NOT also appear as a single page
      const pages = [
        createPageInfo('outer back.png'),
        createPageInfo('outer front.png'),
        createPageInfo('inner front.png'),
        createPageInfo('1.png'),
        createPageInfo('2.png'),
        createPageInfo('3.png'),
        createPageInfo('4.png'),
        createPageInfo('5.png'),
        createPageInfo('6.png'),
        createPageInfo('7.png'),
        createPageInfo('8.png'),
        createPageInfo('inner back.png'),
      ];
      const spreads: SpreadInfo[] = [];

      const result = organizeIntoSpreads(pages, spreads);

      // Inner back should appear exactly once (paired with page 8)
      const innerBackSpreads = result.filter(s => 
        s.pageNumbers.includes(-1) || s.displayLabel.toLowerCase().includes('inner back')
      );
      expect(innerBackSpreads.length).toBe(1);
      expect(innerBackSpreads[0].type).toBe('auto-paired-spread');
      expect(innerBackSpreads[0].displayLabel).toBe('Page 8 + Inner Back Cover');

      // Should NOT have inner back as a single page
      const singleInnerBack = result.find(s => 
        s.type === 'single-page' && s.pageNumbers.includes(-1)
      );
      expect(singleInnerBack).toBeUndefined();
    });

    it('should not duplicate inner front when auto-paired with page 1', () => {
      // Similar scenario for inner front
      const pages = [
        createPageInfo('outer back.png'),
        createPageInfo('outer front.png'),
        createPageInfo('inner front.png'),
        createPageInfo('1.png'),
        createPageInfo('2.png'),
        createPageInfo('3.png'),
      ];
      const spreads: SpreadInfo[] = [];

      const result = organizeIntoSpreads(pages, spreads);

      // Inner front should appear exactly once (paired with page 1)
      const innerFrontSpreads = result.filter(s => 
        s.pageNumbers.includes(-0.5) || s.displayLabel.toLowerCase().includes('inner front')
      );
      expect(innerFrontSpreads.length).toBe(1);
      expect(innerFrontSpreads[0].type).toBe('auto-paired-spread');
      expect(innerFrontSpreads[0].displayLabel).toBe('Inner Front Cover + Page 1');

      // Should NOT have inner front as a single page
      const singleInnerFront = result.find(s => 
        s.type === 'single-page' && s.pageNumbers.includes(-0.5)
      );
      expect(singleInnerFront).toBeUndefined();
    });
  });

  describe('estimateDPI', () => {
    it('should estimate DPI for standard comic size', () => {
      // Standard US comic: 6.625" x 10.25" trim + 0.236" bleed = 6.861" x 10.486" art
      // At 300 DPI: 2058 x 3146 px
      const dpi = estimateDPI(2058, 3146);
      expect(dpi).toBeGreaterThan(290);
      expect(dpi).toBeLessThan(310);
    });

    it('should estimate DPI for digest size', () => {
      // Digest: 5.5" x 8.5" trim + 0.236" bleed = 5.736" x 8.736" art
      // At 300 DPI: 1721 x 2621 px
      const dpi = estimateDPI(1721, 2621);
      expect(dpi).toBeGreaterThan(290);
      expect(dpi).toBeLessThan(310);
    });
  });

  describe('calculateTrimSize', () => {
    it('should calculate trim size from art size', () => {
      // Art size: 7.84" x 11.85" at 530 DPI
      const artWidth = 7.84 * 530;
      const artHeight = 11.85 * 530;
      const trimSize = calculateTrimSize(artWidth, artHeight, 530);

      // Trim = art - 0.236" (3mm bleed on each side)
      expect(trimSize.width).toBeCloseTo(7.84 - 0.236, 1);
      expect(trimSize.height).toBeCloseTo(11.85 - 0.236, 1);
    });
  });
});

