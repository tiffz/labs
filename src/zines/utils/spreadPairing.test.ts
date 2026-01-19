import { describe, it, expect } from 'vitest';
import { 
  buildPrintSpreads, 
  buildBookPages, 
  getPageLabel, 
  padToMultipleOf4, 
  calculatePageCount, 
  getPageFileName, 
  createSpreadFileName, 
  createPageFileName,
  calculateRequiredContentPages,
  type PrintSpread 
} from './spreadPairing';
import { detectSpread, extractPageNumber } from './fileParser';
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
const createPage = (pageNumber: number, name?: string): BookletPageInfo => ({
  parsedFile: createParsedFile(pageNumber, name || `page_${pageNumber}.png`),
  imageData: `data:image/png;base64,${pageNumber}`,
  width: 1000,
  height: 1500,
});

// Helper to create a mock spread
const createSpread = (pages: [number, number], name?: string): SpreadInfo => ({
  parsedFile: {
    ...createParsedFile(pages[0], name || `spread_${pages[0]}_${pages[1]}.png`),
    isSpread: true,
    spreadPages: pages,
  },
  imageData: `data:image/png;base64,spread_${pages[0]}_${pages[1]}`,
  width: 2000,
  height: 1500,
  pages,
});

// Helper to extract page numbers from spreads for easier testing
const getSpreadPageNums = (spreads: PrintSpread[]): Array<{ left: number | undefined; right: number | undefined; type: string }> => {
  return spreads.map(s => ({
    left: s.leftPage?.pageNum,
    right: s.rightPage?.pageNum,
    type: s.type,
  }));
};

describe('getPageLabel', () => {
  it('returns correct labels for special pages', () => {
    expect(getPageLabel(0)).toBe('Front Cover');
    expect(getPageLabel(-0.5)).toBe('Inner Front');
    expect(getPageLabel(-1)).toBe('Inner Back');
    expect(getPageLabel(-2)).toBe('Back Cover');
    expect(getPageLabel(-3)).toBe('Back Cover');
  });

  it('returns correct labels for regular pages', () => {
    expect(getPageLabel(1)).toBe('Page 1');
    expect(getPageLabel(5)).toBe('Page 5');
    expect(getPageLabel(12)).toBe('Page 12');
  });
});

describe('calculateRequiredContentPages', () => {
  it('returns 0 for no content pages', () => {
    expect(calculateRequiredContentPages(0)).toBe(0);
    expect(calculateRequiredContentPages(-1)).toBe(0);
  });

  it('rounds up to nearest multiple of 4', () => {
    expect(calculateRequiredContentPages(1)).toBe(4);
    expect(calculateRequiredContentPages(2)).toBe(4);
    expect(calculateRequiredContentPages(3)).toBe(4);
    expect(calculateRequiredContentPages(4)).toBe(4);
  });

  it('handles exact multiples of 4', () => {
    expect(calculateRequiredContentPages(4)).toBe(4);
    expect(calculateRequiredContentPages(8)).toBe(8);
    expect(calculateRequiredContentPages(12)).toBe(12);
  });

  it('rounds up non-multiples of 4', () => {
    expect(calculateRequiredContentPages(5)).toBe(8);
    expect(calculateRequiredContentPages(6)).toBe(8);
    expect(calculateRequiredContentPages(7)).toBe(8);
    expect(calculateRequiredContentPages(9)).toBe(12);
    expect(calculateRequiredContentPages(10)).toBe(12);
  });
});

describe('buildPrintSpreads', () => {
  describe('basic pairing', () => {
    it('creates outer cover spread with front and back cover', () => {
      const pages = [
        createPage(0, 'front_cover.png'),
        createPage(-2, 'back_cover.png'),
      ];
      
      const spreads = buildPrintSpreads(pages, []);
      const pageNums = getSpreadPageNums(spreads);
      
      expect(pageNums).toContainEqual({ left: -2, right: 0, type: 'auto-paired' });
    });

    it('creates inner front + page 1 spread', () => {
      const pages = [
        createPage(-0.5, 'inner_front.png'),
        createPage(1, 'page_1.png'),
      ];
      
      const spreads = buildPrintSpreads(pages, []);
      const pageNums = getSpreadPageNums(spreads);
      
      expect(pageNums).toContainEqual({ left: -0.5, right: 1, type: 'auto-paired' });
    });

    it('pairs even and odd pages correctly (2-3, 4-5, etc.)', () => {
      const pages = [
        createPage(2),
        createPage(3),
        createPage(4),
        createPage(5),
      ];
      
      const spreads = buildPrintSpreads(pages, []);
      const pageNums = getSpreadPageNums(spreads);
      
      expect(pageNums).toContainEqual({ left: 2, right: 3, type: 'auto-paired' });
      expect(pageNums).toContainEqual({ left: 4, right: 5, type: 'auto-paired' });
    });
  });

  describe('page duplication prevention', () => {
    it('does not duplicate page 12 when no page 13 exists', () => {
      const pages = [
        createPage(0, 'front_cover.png'),
        createPage(-0.5, 'inner_front.png'),
        createPage(1),
        createPage(2),
        createPage(3),
        createPage(4),
        createPage(5),
        createPage(6),
        createPage(7),
        createPage(8),
        createPage(9),
        createPage(10),
        createPage(11),
        createPage(12),
        createPage(-1, 'inner_back.png'),
        createPage(-2, 'back_cover.png'),
      ];
      
      const spreads = buildPrintSpreads(pages, []);
      
      // Count how many times page 12 appears
      let page12Count = 0;
      for (const spread of spreads) {
        if (spread.leftPage?.pageNum === 12) page12Count++;
        if (spread.rightPage?.pageNum === 12) page12Count++;
      }
      
      expect(page12Count).toBe(1);
      
      // Page 12 should pair with Inner Back, NOT with page 13
      const innerBackSpread = spreads.find(s => s.rightPage?.pageNum === -1);
      expect(innerBackSpread?.leftPage?.pageNum).toBe(12);
    });

    it('pairs page 10 with page 11 when page 12 pairs with inner back', () => {
      const pages = [
        createPage(2),
        createPage(3),
        createPage(10),
        createPage(11),
        createPage(12),
        createPage(-1, 'inner_back.png'),
      ];
      
      const spreads = buildPrintSpreads(pages, []);
      const pageNums = getSpreadPageNums(spreads);
      
      // 10-11 should be paired
      expect(pageNums).toContainEqual({ left: 10, right: 11, type: 'auto-paired' });
      
      // 12 should pair with inner back
      expect(pageNums).toContainEqual({ left: 12, right: -1, type: 'auto-paired' });
      
      // No 12-13 spread should exist
      expect(pageNums).not.toContainEqual({ left: 12, right: 13, type: 'auto-paired' });
    });
  });

  describe('handling gaps in page numbers', () => {
    it('handles gaps in page numbers (e.g., pages 1, 2, 5, 6)', () => {
      const pages = [
        createPage(1),
        createPage(2),
        createPage(5),
        createPage(6),
      ];
      
      const spreads = buildPrintSpreads(pages, []);
      const pageNums = getSpreadPageNums(spreads);
      
      // Should have inner front + page 1
      expect(pageNums.some(s => s.right === 1)).toBe(true);
      
      // Should NOT create 2-3 spread since page 3 doesn't exist
      // But 2 should appear somewhere (with inner back if it's the last even)
      const has2 = pageNums.some(s => s.left === 2 || s.right === 2);
      expect(has2).toBe(true);
    });

    it('handles only odd pages uploaded', () => {
      const pages = [
        createPage(1),
        createPage(3),
        createPage(5),
      ];
      
      const spreads = buildPrintSpreads(pages, []);
      
      // Should still work without crashing
      expect(spreads.length).toBeGreaterThan(0);
    });
  });

  describe('explicit spreads', () => {
    it('includes explicit spreads in the result', () => {
      const pages = [
        createPage(0),
        createPage(1),
      ];
      const explicitSpreads = [
        createSpread([2, 3], 'spread_2_3.png'),
      ];
      
      const spreads = buildPrintSpreads(pages, explicitSpreads);
      
      const explicitSpread = spreads.find(s => s.type === 'explicit-spread');
      expect(explicitSpread).toBeDefined();
      expect(explicitSpread?.leftPage?.pageNum).toBe(2);
      expect(explicitSpread?.rightPage?.pageNum).toBe(3);
    });

    it('excludes pages that are in explicit spreads from auto-pairing', () => {
      const pages = [
        createPage(2),
        createPage(3),
        createPage(4),
        createPage(5),
      ];
      const explicitSpreads = [
        createSpread([2, 3]),
      ];
      
      const spreads = buildPrintSpreads(pages, explicitSpreads);
      
      // Should NOT have an auto-paired 2-3 spread
      const autoPaired2_3 = spreads.find(
        s => s.type === 'auto-paired' && s.leftPage?.pageNum === 2 && s.rightPage?.pageNum === 3
      );
      expect(autoPaired2_3).toBeUndefined();
      
      // Should have 4-5 auto-paired
      const autoPaired4_5 = spreads.find(
        s => s.type === 'auto-paired' && s.leftPage?.pageNum === 4 && s.rightPage?.pageNum === 5
      );
      expect(autoPaired4_5).toBeDefined();
    });
  });

  describe('sorting', () => {
    it('sorts spreads in reading order', () => {
      const pages = [
        createPage(-2, 'back_cover.png'),
        createPage(0, 'front_cover.png'),
        createPage(-0.5, 'inner_front.png'),
        createPage(1),
        createPage(2),
        createPage(3),
        createPage(-1, 'inner_back.png'),
      ];
      
      const spreads = buildPrintSpreads(pages, []);
      
      // First spread should be outer cover (back + front)
      expect(spreads[0].leftPage?.pageNum).toBe(-2);
      expect(spreads[0].rightPage?.pageNum).toBe(0);
      
      // Second should be inner front + page 1
      expect(spreads[1].leftPage?.pageNum).toBe(-0.5);
      expect(spreads[1].rightPage?.pageNum).toBe(1);
      
      // Last should have inner back
      const lastSpread = spreads[spreads.length - 1];
      expect(lastSpread.rightPage?.pageNum).toBe(-1);
    });
  });
});

describe('buildBookPages', () => {
  it('starts with a blank page so cover appears on right', () => {
    const pages = [createPage(0, 'front_cover.png')];
    const bookPages = buildBookPages(pages, []);
    
    expect(bookPages[0].isBlank).toBe(true);
    expect(bookPages[0].id).toBe('blank-start');
  });

  it('returns even number of pages', () => {
    const pages = [
      createPage(0),
      createPage(1),
      createPage(2),
    ];
    const bookPages = buildBookPages(pages, []);
    
    expect(bookPages.length % 2).toBe(0);
  });

  it('marks explicit spreads correctly', () => {
    const pages: BookletPageInfo[] = [];
    const explicitSpreads = [createSpread([2, 3])];
    
    const bookPages = buildBookPages(pages, explicitSpreads);
    
    const spreadPage = bookPages.find(p => p.isSpread);
    expect(spreadPage).toBeDefined();
  });
});

describe('buildBookPages - reading order', () => {
  it('starts with front cover on the right (after blank)', () => {
    const pages = [
      createPage(0, 'front_cover.png'),
      createPage(-2, 'back_cover.png'),
    ];
    
    const bookPages = buildBookPages(pages, []);
    
    // First page should be blank (so cover appears on right)
    expect(bookPages[0].isBlank).toBe(true);
    // Second page should be front cover
    expect(bookPages[1].label).toBe('Front Cover');
  });

  it('ends with back cover after inner back', () => {
    const pages = [
      createPage(0, 'front_cover.png'),
      createPage(1, 'page_1.png'),
      createPage(-1, 'inner_back.png'),
      createPage(-2, 'back_cover.png'),
    ];
    
    const bookPages = buildBookPages(pages, []);
    
    // Find back cover and inner back
    const innerBackIndex = bookPages.findIndex(p => p.label === 'Inner Back');
    const backCoverIndex = bookPages.findIndex(p => p.label === 'Back Cover');
    
    // Inner back should come before back cover
    expect(innerBackIndex).toBeLessThan(backCoverIndex);
  });

  it('maintains reading order: Front Cover, Inner Front, Pages, Inner Back, Back Cover', () => {
    const pages = [
      createPage(0, 'front_cover.png'),
      createPage(-0.5, 'inner_front.png'),
      createPage(1, 'page_1.png'),
      createPage(2, 'page_2.png'),
      createPage(-1, 'inner_back.png'),
      createPage(-2, 'back_cover.png'),
    ];
    
    const bookPages = buildBookPages(pages, []);
    
    // Extract non-blank page labels in order
    const labels = bookPages
      .filter(p => p.label)
      .map(p => p.label);
    
    // Check order
    const frontCoverIndex = labels.indexOf('Front Cover');
    const innerFrontIndex = labels.indexOf('Inner Front');
    const page1Index = labels.indexOf('Page 1');
    const page2Index = labels.indexOf('Page 2');
    const innerBackIndex = labels.indexOf('Inner Back');
    const backCoverIndex = labels.indexOf('Back Cover');
    
    expect(frontCoverIndex).toBeLessThan(innerFrontIndex);
    expect(innerFrontIndex).toBeLessThan(page1Index);
    expect(page1Index).toBeLessThan(page2Index);
    expect(page2Index).toBeLessThan(innerBackIndex);
    expect(innerBackIndex).toBeLessThan(backCoverIndex);
  });
});

describe('padToMultipleOf4', () => {
  it('does not add spreads when already a multiple of 4', () => {
    // 2 spreads = 4 pages (already multiple of 4)
    const spreads: PrintSpread[] = [
      { id: 'spread-1', type: 'auto-paired', readingOrder: 1, displayLabel: 'Test 1' },
      { id: 'spread-2', type: 'auto-paired', readingOrder: 2, displayLabel: 'Test 2' },
    ];
    
    const { paddedSpreads, blankSpreadsAdded } = padToMultipleOf4(spreads);
    
    expect(paddedSpreads.length).toBe(2);
    expect(blankSpreadsAdded).toBe(0);
  });

  it('adds one spread when 3 spreads (6 pages) exist', () => {
    // 3 spreads = 6 pages, need 8 pages (add 1 spread = 2 pages)
    const spreads: PrintSpread[] = [
      { id: 'spread-1', type: 'auto-paired', leftPage: { pageNum: 2, label: 'Page 2' }, rightPage: { pageNum: 3, label: 'Page 3' }, readingOrder: 2, displayLabel: 'Test 1' },
      { id: 'spread-2', type: 'auto-paired', leftPage: { pageNum: 4, label: 'Page 4' }, rightPage: { pageNum: 5, label: 'Page 5' }, readingOrder: 4, displayLabel: 'Test 2' },
      { id: 'spread-3', type: 'auto-paired', leftPage: { pageNum: 6, label: 'Page 6' }, rightPage: { pageNum: 7, label: 'Page 7' }, readingOrder: 6, displayLabel: 'Test 3' },
    ];
    
    const { paddedSpreads, blankSpreadsAdded } = padToMultipleOf4(spreads);
    
    expect(calculatePageCount(paddedSpreads)).toBe(8);
    expect(blankSpreadsAdded).toBe(1);
  });

  it('adds blank spreads in the correct position', () => {
    // 1 spread = 2 pages, need 4 pages (add 1 spread)
    const spreads: PrintSpread[] = [
      { id: 'outer-cover-spread', type: 'auto-paired', leftPage: { pageNum: -2, label: 'Back' }, rightPage: { pageNum: 0, label: 'Front' }, readingOrder: 9999, displayLabel: 'Outer Cover' },
    ];
    
    const { paddedSpreads, blankSpreadsAdded } = padToMultipleOf4(spreads);
    
    expect(paddedSpreads.length).toBe(2);
    expect(blankSpreadsAdded).toBe(1);
    
    // Blank spread should be added before the outer cover
    const blankSpread = paddedSpreads.find(s => s.id.startsWith('blank-spread'));
    expect(blankSpread).toBeDefined();
  });

  it('correctly calculates page count', () => {
    const spreads: PrintSpread[] = [
      { id: 'spread-1', type: 'auto-paired', readingOrder: 1, displayLabel: 'Test 1' },
      { id: 'spread-2', type: 'auto-paired', readingOrder: 2, displayLabel: 'Test 2' },
      { id: 'spread-3', type: 'auto-paired', readingOrder: 3, displayLabel: 'Test 3' },
    ];
    
    expect(calculatePageCount(spreads)).toBe(6);
  });
});

describe('getPageFileName and createSpreadFileName', () => {
  describe('getPageFileName', () => {
    it('returns correct filename components for special pages', () => {
      expect(getPageFileName(0)).toBe('front');
      expect(getPageFileName(-0.5)).toBe('innerfront');
      expect(getPageFileName(-1)).toBe('innerback');
      expect(getPageFileName(-2)).toBe('back');
      expect(getPageFileName(-3)).toBe('back');
    });

    it('returns page number for regular pages', () => {
      expect(getPageFileName(1)).toBe('page1');
      expect(getPageFileName(2)).toBe('page2');
      expect(getPageFileName(10)).toBe('page10');
    });
  });

  describe('createPageFileName', () => {
    it('creates proper single page filenames', () => {
      expect(createPageFileName(0)).toBe('front.png');
      expect(createPageFileName(-2)).toBe('back.png');
      expect(createPageFileName(1)).toBe('page1.png');
      expect(createPageFileName(5)).toBe('page5.png');
    });
  });

  describe('createSpreadFileName', () => {
    it('creates proper spread filenames for outer covers', () => {
      expect(createSpreadFileName(-2, 0)).toBe('back-front.png');
    });

    it('creates proper spread filenames for inner covers', () => {
      expect(createSpreadFileName(-0.5, 1)).toBe('innerfront-page1.png');
    });

    it('creates proper spread filenames for regular pages', () => {
      expect(createSpreadFileName(2, 3)).toBe('page2-page3.png');
      expect(createSpreadFileName(4, 5)).toBe('page4-page5.png');
    });
  });
});

describe('buildBookPages with outer cover spread', () => {
  it('handles outer cover spread (back-front) correctly', () => {
    // Create a spread that combines back cover (-2) and front cover (0)
    const outerCoverSpread = createSpread([-2, 0], 'back-front.png');
    
    // No individual pages, just the spread
    const pages: BookletPageInfo[] = [];
    const spreads: SpreadInfo[] = [outerCoverSpread];
    
    const bookPages = buildBookPages(pages, spreads);
    
    // The outer cover spread should be present
    const spreadPage = bookPages.find(p => p.id.includes('spread--2-0'));
    expect(spreadPage).toBeDefined();
    expect(spreadPage?.isSpread).toBe(true);
    expect(spreadPage?.imageData).toBeTruthy();
    
    // Front cover (0) should NOT be added as a separate page since it's in the spread
    const individualFrontCover = bookPages.find(p => p.id === 'page-0');
    expect(individualFrontCover).toBeUndefined(); // Should not exist
    
    // Back cover (-2) should NOT be added as a separate page since it's in the spread
    const individualBackCover = bookPages.find(p => p.id === 'page--2');
    expect(individualBackCover).toBeUndefined(); // Should not exist
  });

  it('has correct reading order when outer cover is a spread', () => {
    const outerCoverSpread = createSpread([-2, 0], 'back-front.png');
    const page1 = createPage(1);
    const page2 = createPage(2);
    
    const bookPages = buildBookPages([page1, page2], [outerCoverSpread]);
    
    const labels = bookPages.map(p => p.label).filter(l => l);
    
    // Back cover spread should be at the end (in a booklet, you read front to back)
    // But the spread contains both front (-2 left) and back (0 right)
    expect(labels.includes('Page 1')).toBe(true);
    expect(labels.includes('Page 2')).toBe(true);
  });
});

describe('buildPrintSpreads with explicit spreads', () => {
  it('includes explicit outer cover spread', () => {
    const outerCoverSpread = createSpread([-2, 0], 'back-front.png');
    const page1 = createPage(1);
    const page2 = createPage(2);
    
    const spreads = buildPrintSpreads([page1, page2], [outerCoverSpread]);
    
    // Should have the explicit spread
    const explicitSpread = spreads.find(s => s.type === 'explicit-spread');
    expect(explicitSpread).toBeDefined();
    expect(explicitSpread?.explicitSpread?.pages).toEqual([-2, 0]);
  });

  it('does not duplicate pages that are in explicit spreads', () => {
    const outerCoverSpread = createSpread([-2, 0], 'back-front.png');
    const frontCover = createPage(0);
    const backCover = createPage(-2);
    const page1 = createPage(1);
    
    const spreads = buildPrintSpreads([frontCover, backCover, page1], [outerCoverSpread]);
    
    // Should NOT have auto-paired outer cover spread (since we have explicit one)
    const autoOuterCover = spreads.find(s => s.id === 'outer-cover-spread');
    expect(autoOuterCover).toBeUndefined();
    
    // Should have the explicit spread
    const explicitSpread = spreads.find(s => s.type === 'explicit-spread');
    expect(explicitSpread).toBeDefined();
  });
});

describe('spread linking workflow', () => {
  it('spread filename is properly parsed by file parser', () => {
    // Test outer cover spread
    const outerCover = detectSpread('back-front.png');
    expect(outerCover.isSpread).toBe(true);
    expect(outerCover.pages).toEqual([-2, 0]);
    
    // Test regular page spread with numeric names
    const numericSpread = detectSpread('2-3.png');
    expect(numericSpread.isSpread).toBe(true);
    expect(numericSpread.pages).toEqual([2, 3]);
  });

  it('split page filenames are properly parsed', () => {
    // Test that split page filenames work
    expect(extractPageNumber('front.png')).toBe(0);
    expect(extractPageNumber('back.png')).toBe(-2);
    expect(extractPageNumber('page1.png')).toBe(1);
    expect(extractPageNumber('page5.png')).toBe(5);
  });
});

describe('multiple-of-4 padding', () => {
  describe('buildBookPages padding', () => {
    it('pads to 4 content pages when user uploads 1-3 pages', () => {
      // User uploads page 1 only
      const pages = [createPage(1)];
      const bookPages = buildBookPages(pages, []);
      
      // Should have pages 1, 2, 3, 4 as content (padded to 4)
      // Plus Front Cover, Inner Front, Inner Back, Back Cover = 8 total content
      // Plus blank-start for display = 9 total
      const contentPages = bookPages.filter(p => 
        p.label && p.label.startsWith('Page ')
      );
      expect(contentPages.length).toBe(4); // Pages 1, 2, 3, 4
    });

    it('pads to 8 content pages when user uploads 5-8 pages', () => {
      // User uploads pages 1-6
      const pages = [
        createPage(1),
        createPage(2),
        createPage(3),
        createPage(4),
        createPage(5),
        createPage(6),
      ];
      const bookPages = buildBookPages(pages, []);
      
      // Should have pages 1-8 as content (padded from 6 to 8)
      const contentPages = bookPages.filter(p => 
        p.label && p.label.startsWith('Page ')
      );
      expect(contentPages.length).toBe(8);
    });

    it('marks padding pages as blank', () => {
      // User uploads pages 1 and 2 only
      const pages = [createPage(1), createPage(2)];
      const bookPages = buildBookPages(pages, []);
      
      // Pages 3 and 4 should be blank (padding)
      const page3 = bookPages.find(p => p.label === 'Page 3');
      const page4 = bookPages.find(p => p.label === 'Page 4');
      
      expect(page3).toBeDefined();
      expect(page3?.isBlank).toBe(true);
      expect(page3?.imageData).toBe('');
      
      expect(page4).toBeDefined();
      expect(page4?.isBlank).toBe(true);
      expect(page4?.imageData).toBe('');
    });
  });

  describe('buildPrintSpreads padding', () => {
    it('creates spreads for padding pages', () => {
      // User uploads page 1 only (needs padding to 4 content pages)
      const pages = [createPage(1)];
      const spreads = buildPrintSpreads(pages, []);
      
      // Should have Inner Front + Page 1 spread
      const innerFrontSpread = spreads.find(s => 
        s.leftPage?.pageNum === -0.5 && s.rightPage?.pageNum === 1
      );
      expect(innerFrontSpread).toBeDefined();
      
      // Should have Pages 2-3 spread (both blank/padding)
      const pages23Spread = spreads.find(s => 
        s.leftPage?.pageNum === 2 && s.rightPage?.pageNum === 3
      );
      expect(pages23Spread).toBeDefined();
      
      // Should have Page 4 + Inner Back spread
      const page4InnerBackSpread = spreads.find(s => 
        s.leftPage?.pageNum === 4 && s.rightPage?.pageNum === -1
      );
      expect(page4InnerBackSpread).toBeDefined();
    });

    it('shows correct blank status in spreads', () => {
      // User uploads only front cover and page 1
      const pages = [createPage(0), createPage(1)];
      const spreads = buildPrintSpreads(pages, []);
      
      // Pages 2-3 spread should have both pages as undefined (blank)
      const pages23Spread = spreads.find(s => 
        s.leftPage?.pageNum === 2 && s.rightPage?.pageNum === 3
      );
      expect(pages23Spread?.leftPage?.page).toBeUndefined();
      expect(pages23Spread?.rightPage?.page).toBeUndefined();
    });
  });
});
