import type { BookletPageInfo, SpreadInfo } from '../types';

export interface PreviewSpread {
  type: 'explicit-spread' | 'auto-paired-spread' | 'single-page';
  leftPage?: BookletPageInfo;
  rightPage?: BookletPageInfo;
  explicitSpread?: SpreadInfo;
  pageNumbers: [number, number] | [number];
  displayLabel: string;
}

/**
 * Organizes pages into spreads for preview, matching what the final PDF will look like.
 * Uses book layout: even pages on left, odd pages on right.
 * Inner Front Cover = logical page 0 (even, left), Page 1 = odd (right), etc.
 */
export function organizeIntoSpreads(
  pages: BookletPageInfo[],
  spreads: SpreadInfo[]
): PreviewSpread[] {
  const result: PreviewSpread[] = [];
  
  // Separate pages by type
  const regularPages: BookletPageInfo[] = [];
  const specialPages: BookletPageInfo[] = [];
  
  for (const page of pages) {
    const pageNum = page.parsedFile.pageNumber ?? 9999;
    if (pageNum < 0 || pageNum === 0) {
      specialPages.push(page);
    } else {
      regularPages.push(page);
    }
  }
  
  // Sort regular pages by page number
  regularPages.sort((a, b) => {
    const aNum = a.parsedFile.pageNumber ?? 9999;
    const bNum = b.parsedFile.pageNumber ?? 9999;
    return aNum - bNum;
  });
  
  // Sort spreads by first page number
  const sortedSpreads = [...spreads].sort((a, b) => {
    // Normalize page numbers for sorting (treat special pages appropriately)
    const aFirst = a.pages[0] < 0 ? a.pages[0] + 1000 : a.pages[0];
    const bFirst = b.pages[0] < 0 ? b.pages[0] + 1000 : b.pages[0];
    return aFirst - bFirst;
  });
  
  // Create a map of page numbers to pages for quick lookup
  const pageMap = new Map<number, BookletPageInfo>();
  for (const page of regularPages) {
    const pageNum = page.parsedFile.pageNumber;
    if (pageNum !== null) {
      pageMap.set(pageNum, page);
    }
  }
  
  // Track which pages are already in explicit spreads
  const pagesInSpreads = new Set<number>();
  const pagesInSpreadsSpecial = new Set<number>(); // Track special pages in spreads
  for (const spread of sortedSpreads) {
    pagesInSpreads.add(spread.pages[0]);
    pagesInSpreads.add(spread.pages[1]);
    if (spread.pages[0] < 0) pagesInSpreadsSpecial.add(spread.pages[0]);
    if (spread.pages[1] < 0) pagesInSpreadsSpecial.add(spread.pages[1]);
  }
  
  // Handle special pages (covers)
  // Separate covers by type
  const outerBackCover = specialPages.find(p => {
    const num = p.parsedFile.pageNumber ?? 9999;
    return num === -2 || num === -3; // back, rear, or last (outer back)
  });
  
  const outerFrontCover = specialPages.find(p => {
    const num = p.parsedFile.pageNumber ?? 9999;
    return num === 0; // front (outer front)
  });
  
  const innerFrontCover = specialPages.find(p => {
    const num = p.parsedFile.pageNumber ?? 9999;
    return num === -0.5; // inner front
  });
  
  const innerBackCover = specialPages.find(p => {
    const num = p.parsedFile.pageNumber ?? 9999;
    return num === -1; // inner back
  });
  
  // Outer covers: back + front as a spread (comes first)
  if (outerBackCover && outerFrontCover) {
    result.push({
      type: 'auto-paired-spread',
      leftPage: outerBackCover,
      rightPage: outerFrontCover,
      pageNumbers: [-2, 0],
      displayLabel: 'Outer Cover (Back + Front)',
    });
  } else if (outerBackCover) {
    result.push({
      type: 'single-page',
      leftPage: outerBackCover,
      pageNumbers: [-2],
      displayLabel: 'Outer Back Cover',
    });
  } else if (outerFrontCover) {
    result.push({
      type: 'single-page',
      leftPage: outerFrontCover,
      pageNumbers: [0],
      displayLabel: 'Outer Front Cover',
    });
  }
  
  // Inner front cover pairs with page 1 (will be handled in regular pages section)
  // Inner back cover pairs with last page (will be handled in regular pages section)
  
  // Process explicit spreads first (they override auto-pairing)
  for (const spread of sortedSpreads) {
    // Create display label using the original filename if available
    let displayLabel = '';
    const leftPageNum = spread.pages[0];
    const rightPageNum = spread.pages[1];
    
    // Use the parsed file's display name if it's descriptive, otherwise create one
    const originalName = spread.parsedFile.displayName.toLowerCase();
    if (originalName.includes('inner') || originalName.includes('cover') || 
        originalName.includes('front') || originalName.includes('back')) {
      // Use a cleaned version of the filename
      displayLabel = spread.parsedFile.displayName.replace(/\.[^/.]+$/, '');
    } else if (leftPageNum < 0 || rightPageNum < 0) {
      // Handle special pages in display
      const leftLabel = leftPageNum === -0.5 ? 'Inner Front' : 
                       leftPageNum === -1 ? 'Inner Back' :
                       leftPageNum === -2 ? 'Outer Back' :
                       leftPageNum === 0 ? 'Outer Front' : `Page ${leftPageNum}`;
      const rightLabel = rightPageNum === -0.5 ? 'Inner Front' : 
                        rightPageNum === -1 ? 'Inner Back' :
                        rightPageNum === -2 ? 'Outer Back' :
                        rightPageNum === 0 ? 'Outer Front' : `Page ${rightPageNum}`;
      displayLabel = `${leftLabel} + ${rightLabel}`;
    } else {
      displayLabel = `Pages ${leftPageNum}-${rightPageNum}`;
    }
    
    result.push({
      type: 'explicit-spread',
      explicitSpread: spread,
      pageNumbers: spread.pages,
      displayLabel,
    });
  }
  
  // Process regular pages, pairing them into spreads
  // Book layout: even pages on left, odd pages on right
  // Inner Front Cover = logical page 0 (even, left), Page 1 = odd (right)
  let i = 0;
  const lastPageNum = regularPages.length > 0 
    ? Math.max(...regularPages.map(p => p.parsedFile.pageNumber ?? 0).filter(n => n > 0))
    : null;
  
  // First, handle inner front cover + page 1 spread
  // Only create this auto-paired spread if:
  // 1. There's an inner front cover page
  // 2. There's a page 1 available
  // 3. Page 1 isn't already in an explicit spread
  // 4. Inner front isn't already in an explicit spread (to avoid duplicates)
  if (innerFrontCover && regularPages.some(p => p.parsedFile.pageNumber === 1)) {
    const page1 = regularPages.find(p => p.parsedFile.pageNumber === 1);
    if (page1 && !pagesInSpreads.has(1) && !pagesInSpreadsSpecial.has(-0.5)) {
      result.push({
        type: 'auto-paired-spread',
        leftPage: innerFrontCover,  // Even (logical page 0)
        rightPage: page1,           // Odd (page 1)
        pageNumbers: [-0.5, 1],
        displayLabel: 'Inner Front Cover + Page 1',
      });
      pagesInSpreads.add(1);
      pagesInSpreadsSpecial.add(-0.5); // Mark inner front as used
    }
  }
  
  // Handle Page 1 without Inner Front Cover
  // If there's no inner front cover, Page 1 should be shown on the right side alone
  // or paired with Page 2 depending on the layout
  const hasPage1 = regularPages.some(p => p.parsedFile.pageNumber === 1);
  
  if (hasPage1 && !innerFrontCover && !pagesInSpreads.has(1)) {
    const page1 = regularPages.find(p => p.parsedFile.pageNumber === 1)!;
    
    // Page 1 goes on the right side alone (no left page)
    // This is the standard book layout where Page 1 is on the right
    result.push({
      type: 'single-page',
      rightPage: page1,
      pageNumbers: [1],
      displayLabel: 'Page 1',
    });
    pagesInSpreads.add(1);
  }
  
  // Process remaining regular pages in pairs
  // Even pages go on left, odd pages on right
  while (i < regularPages.length) {
    const currentPage = regularPages[i];
    const currentPageNum = currentPage.parsedFile.pageNumber ?? 9999;
    
    // Skip if this page is already in an explicit spread or paired
    if (pagesInSpreads.has(currentPageNum)) {
      i++;
      continue;
    }
    
    // Determine if current page is even or odd
    const isEven = currentPageNum % 2 === 0;
    
    // Special case: last page should pair with inner back cover if it exists
    if (currentPageNum === lastPageNum && innerBackCover && !pagesInSpreadsSpecial.has(-1)) {
      // Last page (even) + Inner Back Cover (odd/right)
      result.push({
        type: 'auto-paired-spread',
        leftPage: currentPage,
        rightPage: innerBackCover,
        pageNumbers: [currentPageNum, -1],
        displayLabel: `Page ${currentPageNum} + Inner Back Cover`,
      });
      pagesInSpreadsSpecial.add(-1); // Mark inner back as used to prevent duplicate
      i++;
      continue;
    }
    
    // For proper book layout:
    // - Even pages should be on the left
    // - Odd pages should be on the right
    // So we pair: even (left) + next odd (right)
    
    if (isEven) {
      // Even page - should be on left, pair with next odd page
      const nextOddPage = regularPages.find(p => {
        const num = p.parsedFile.pageNumber ?? 9999;
        return num === currentPageNum + 1 && num % 2 === 1 && !pagesInSpreads.has(num);
      });
      
      if (nextOddPage && currentPageNum + 1 === lastPageNum && innerBackCover && !pagesInSpreadsSpecial.has(-1)) {
        // Don't pair if next page is last and should pair with inner back
        result.push({
          type: 'single-page',
          leftPage: currentPage,
          pageNumbers: [currentPageNum],
          displayLabel: `Page ${currentPageNum}`,
        });
        i++;
      } else if (nextOddPage) {
        result.push({
          type: 'auto-paired-spread',
          leftPage: currentPage,      // Even (left)
          rightPage: nextOddPage,     // Odd (right)
          pageNumbers: [currentPageNum, currentPageNum + 1],
          displayLabel: `Pages ${currentPageNum}-${currentPageNum + 1}`,
        });
        pagesInSpreads.add(currentPageNum + 1);
        i++;
      } else {
        // No next odd page - single even page
        result.push({
          type: 'single-page',
          leftPage: currentPage,
          pageNumbers: [currentPageNum],
          displayLabel: `Page ${currentPageNum}`,
        });
        i++;
      }
    } else {
      // Odd page that wasn't paired - this means the previous even page wasn't found
      // or this is page 1 which should pair with inner front (already handled)
      // If it's not page 1, it's an error case - add as single
      if (currentPageNum !== 1) {
        result.push({
          type: 'single-page',
          leftPage: currentPage,
          pageNumbers: [currentPageNum],
          displayLabel: `Page ${currentPageNum}`,
        });
      }
      i++;
    }
  }
  
  // If inner front cover exists but wasn't paired, add it as single
  if (innerFrontCover && !pagesInSpreadsSpecial.has(-0.5)) {
    result.push({
      type: 'single-page',
      leftPage: innerFrontCover,
      pageNumbers: [-0.5],
      displayLabel: 'Inner Front Cover',
    });
  }
  
  // If inner back cover exists but wasn't paired, add it as single
  if (innerBackCover && !pagesInSpreadsSpecial.has(-1)) {
    result.push({
      type: 'single-page',
      leftPage: innerBackCover,
      pageNumbers: [-1],
      displayLabel: 'Inner Back Cover',
    });
  }
  
  // Sort result by first page number for reading order
  result.sort((a, b) => {
    const aFirst = a.pageNumbers[0];
    const bFirst = b.pageNumbers[0];
    
    // Special handling: outer covers should come first
    // Outer back cover (-2) or outer covers spread ([-2, 0]) should come before everything
    const aIsOuterCover = aFirst === -2;
    const bIsOuterCover = bFirst === -2;
    
    if (aIsOuterCover && !bIsOuterCover) return -1;
    if (!aIsOuterCover && bIsOuterCover) return 1;
    
    // If both are outer covers, maintain order
    if (aIsOuterCover && bIsOuterCover) {
      return aFirst - bFirst;
    }
    
    // Inner front cover (-0.5) should come after outer covers but before regular pages
    if (aFirst === -0.5 && bFirst !== -0.5 && !bIsOuterCover) return -1;
    if (aFirst !== -0.5 && bFirst === -0.5 && !aIsOuterCover) return 1;
    
    return aFirst - bFirst;
  });
  
  return result;
}

/**
 * Calculates estimated DPI from image dimensions and trim size
 * Default bleed: 3mm on all sides (0.118" per side = 0.236" total per dimension)
 */
export function estimateDPI(width: number, height: number): number {
  // Common comic book trim sizes (in inches) - these are the FINAL print sizes
  const commonSizes = [
    { width: 6.625, height: 10.25 }, // Standard US comic
    { width: 6.875, height: 10.5 },  // Slightly larger
    { width: 5.5, height: 8.5 },     // Digest size
    { width: 8.5, height: 11 },      // Letter size
  ];
  
  // Default bleed: 3mm = 0.118 inches per side
  const bleedPerSide = 0.118;
  const totalBleed = bleedPerSide * 2; // Top + bottom or left + right
  
  // Try to match art size to trim size + bleed
  let bestDPI = 300; // Default assumption
  let bestMatch = Infinity;
  
  for (const trimSize of commonSizes) {
    // Art size = trim size + bleed
    const artWidth = trimSize.width + totalBleed;
    const artHeight = trimSize.height + totalBleed;
    
    const dpiWidth = width / artWidth;
    const dpiHeight = height / artHeight;
    const avgDPI = (dpiWidth + dpiHeight) / 2;
    
    // Prefer DPI close to 300 (standard print resolution)
    const diff = Math.abs(avgDPI - 300);
    if (diff < bestMatch) {
      bestMatch = diff;
      bestDPI = Math.round(avgDPI);
    }
  }
  
  return bestDPI;
}

/**
 * Gets page dimensions in inches (art size)
 */
export function getPageDimensionsInches(width: number, height: number, dpi: number): { width: number; height: number } {
  return {
    width: Math.round((width / dpi) * 100) / 100,
    height: Math.round((height / dpi) * 100) / 100,
  };
}

/**
 * Calculates trim size (final print size) from art size
 * Uses configurable bleed (default 3mm on all sides)
 */
export function calculateTrimSize(
  artWidth: number, 
  artHeight: number, 
  dpi: number,
  bleedMM: number = 3
): { width: number; height: number } {
  const artWidthInches = artWidth / dpi;
  const artHeightInches = artHeight / dpi;
  
  // Convert bleed from mm to inches (1 inch = 25.4mm)
  const bleedPerSideInches = bleedMM / 25.4;
  const totalBleed = bleedPerSideInches * 2;
  
  const trimWidth = Math.max(0, artWidthInches - totalBleed);
  const trimHeight = Math.max(0, artHeightInches - totalBleed);
  
  return {
    width: Math.round(trimWidth * 100) / 100,
    height: Math.round(trimHeight * 100) / 100,
  };
}
