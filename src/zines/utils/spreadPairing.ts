import type { BookletPageInfo, SpreadInfo } from '../types';
import { getBookletPageFileStem, getBookletPageLabel } from '../../shared/zine/bookletPageLabels';
import {
  buildBookletReadingPages,
  calculateRequiredContentPages,
} from '../../shared/zine/bookletReadingOrder';
import {
  createMixamPageFileName as createPageFileNameShared,
  createMixamSpreadFileName as createSpreadFileNameShared,
} from '../../shared/zine/mixamFileNames';

/**
 * Calculate the required number of content pages to make the total booklet
 * a multiple of 4 (required for proper booklet folding).
 * 
 * A booklet has: Front Cover, Inner Front, [content pages], Inner Back, Back Cover
 * Total = 4 (covers) + content pages
 * For multiple of 4: content pages must be a multiple of 4
 */
export { calculateRequiredContentPages };

// A print spread represents two facing pages in the printed booklet
export interface PrintSpread {
  id: string;
  type: 'explicit-spread' | 'auto-paired';
  leftPage?: { pageNum: number; page?: BookletPageInfo; label: string };
  rightPage?: { pageNum: number; page?: BookletPageInfo; label: string };
  explicitSpread?: SpreadInfo;
  readingOrder: number;
  displayLabel: string;
  canToggleSpread?: boolean;
}

// Get label for a page number
export const getPageLabel = getBookletPageLabel;

// Convert a page number to a filename component that will be parsed correctly
export const getPageFileName = getBookletPageFileStem;

// Create a single page filename from a page number
export const createPageFileName = createPageFileNameShared;

// Create a spread filename from two page numbers
export const createSpreadFileName = createSpreadFileNameShared;

// Get reading order priority for a page number
export const getReadingOrder = (pageNum: number): number => {
  if (pageNum === 0) return 0;           // Front cover
  if (pageNum === -0.5) return 0.5;      // Inner front
  if (pageNum > 0) return pageNum;       // Regular pages
  if (pageNum === -1) return 9998;       // Inner back
  if (pageNum <= -2) return 9999;        // Back cover
  return 5000;
};

/**
 * Builds print spreads from pages and explicit spreads.
 * This function handles proper page pairing for booklet printing.
 */
export function buildPrintSpreads(
  pages: BookletPageInfo[],
  spreads: SpreadInfo[]
): PrintSpread[] {
  const result: PrintSpread[] = [];
  
  // Create a map of page numbers to pages
  const pageMap = new Map<number, BookletPageInfo>();
  for (const page of pages) {
    const pageNum = page.parsedFile.pageNumber;
    if (pageNum !== null) {
      pageMap.set(pageNum, page);
    }
  }
  
  // Track which pages are in explicit spreads
  const pagesInSpreads = new Set<number>();
  for (const spread of spreads) {
    pagesInSpreads.add(spread.pages[0]);
    pagesInSpreads.add(spread.pages[1]);
  }
  
  // Add explicit spreads
  for (const spread of spreads) {
    const [leftNum, rightNum] = spread.pages;
    result.push({
      id: `spread-${leftNum}-${rightNum}`,
      type: 'explicit-spread',
      leftPage: { pageNum: leftNum, label: getPageLabel(leftNum) },
      rightPage: { pageNum: rightNum, label: getPageLabel(rightNum) },
      explicitSpread: spread,
      readingOrder: Math.min(getReadingOrder(leftNum), getReadingOrder(rightNum)),
      displayLabel: `${getPageLabel(leftNum)} – ${getPageLabel(rightNum)} (Spread)`,
      canToggleSpread: true,
    });
  }
  
  // Find special pages
  const frontCover = pageMap.get(0);
  const backCover = pageMap.get(-2) || pageMap.get(-3);
  const innerFront = pageMap.get(-0.5);
  const innerBack = pageMap.get(-1);
  
  // Outer cover spread: Back Cover + Front Cover
  if (!pagesInSpreads.has(0) && !pagesInSpreads.has(-2)) {
    result.push({
      id: 'outer-cover-spread',
      type: 'auto-paired',
      leftPage: { pageNum: -2, page: backCover, label: 'Back Cover' },
      rightPage: { pageNum: 0, page: frontCover, label: 'Front Cover' },
      readingOrder: 0,
      displayLabel: 'Outer Cover (Back + Front)',
      canToggleSpread: !!(frontCover && backCover),
    });
  }
  
  // Inner front + Page 1 spread
  const page1 = pageMap.get(1);
  if (!pagesInSpreads.has(-0.5) && !pagesInSpreads.has(1)) {
    result.push({
      id: 'inner-front-spread',
      type: 'auto-paired',
      leftPage: { pageNum: -0.5, page: innerFront, label: 'Inner Front' },
      rightPage: { pageNum: 1, page: page1, label: 'Page 1' },
      readingOrder: 0.5,
      displayLabel: 'Inner Front + Page 1',
      canToggleSpread: !!(innerFront && page1),
    });
  }
  
  // Regular page pairs: 2+3, 4+5, 6+7, etc.
  // Find all page numbers we need to pair
  const allPageNums = new Set<number>();
  for (const page of pages) {
    const num = page.parsedFile.pageNumber;
    if (num !== null && num > 1 && !pagesInSpreads.has(num)) {
      allPageNums.add(num);
    }
  }
  
  // Find the maximum uploaded page number from both pages and spreads
  const maxPageFromSpreads = spreads.reduce((max, s) => Math.max(max, s.pages[0], s.pages[1]), 0);
  const maxPageFromPages = Math.max(...Array.from(allPageNums), 0);
  const uploadedMaxPage = Math.max(maxPageFromSpreads, maxPageFromPages, 1);
  
  // Calculate required content pages for proper booklet folding (multiple of 4)
  const maxPage = calculateRequiredContentPages(uploadedMaxPage);
  
  // Determine which even page pairs with Inner Back
  // With proper padding, maxPage should always be a multiple of 4, and maxPage (even) pairs with Inner Back
  // This ensures proper booklet structure regardless of what pages are actually uploaded
  let lastEvenPageForInnerBack: number | null = null;
  if (!pagesInSpreads.has(-1) && maxPage > 0) {
    // The last even content page pairs with Inner Back
    // Since maxPage is calculated to be a multiple of 4, it should always be even
    lastEvenPageForInnerBack = maxPage % 2 === 0 ? maxPage : maxPage - 1;
    
    // But if this page is already in an explicit spread, don't reserve it
    if (pagesInSpreads.has(lastEvenPageForInnerBack)) {
      lastEvenPageForInnerBack = null;
    }
  }
  
  // Generate pairs for all even-odd combinations (excluding the page that pairs with Inner Back)
  // This includes blank padding pages to ensure proper multiple-of-4 page count
  const processedPairs = new Set<string>();
  for (let evenPage = 2; evenPage <= maxPage; evenPage += 2) {
    // Skip if this even page will pair with Inner Back
    if (evenPage === lastEvenPageForInnerBack) continue;
    
    const oddPage = evenPage + 1;
    // Make sure oddPage doesn't exceed maxPage
    if (oddPage > maxPage) continue;
    
    const pairKey = `${evenPage}-${oddPage}`;
    
    if (processedPairs.has(pairKey)) continue;
    if (pagesInSpreads.has(evenPage) || pagesInSpreads.has(oddPage)) continue;
    
    const leftPage = pageMap.get(evenPage);
    const rightPage = pageMap.get(oddPage);
    
    // Always add pairs within the required page range (even if both pages are blank)
    // This ensures blank padding pages appear in the UI
    result.push({
      id: `page-spread-${evenPage}-${oddPage}`,
      type: 'auto-paired',
      leftPage: { pageNum: evenPage, page: leftPage, label: getPageLabel(evenPage) },
      rightPage: { pageNum: oddPage, page: rightPage, label: getPageLabel(oddPage) },
      readingOrder: evenPage,
      displayLabel: `Pages ${evenPage}-${oddPage}`,
      canToggleSpread: !!(leftPage && rightPage),
    });
    processedPairs.add(pairKey);
  }
  
  // Always add Inner Back spread when we have content pages
  // This pairs the last even content page with Inner Back
  if (maxPage > 0 && lastEvenPageForInnerBack !== null) {
    const lastPageForInnerBack = pageMap.get(lastEvenPageForInnerBack);
    
    result.push({
      id: 'inner-back-spread',
      type: 'auto-paired',
      leftPage: { pageNum: lastEvenPageForInnerBack, page: lastPageForInnerBack, label: getPageLabel(lastEvenPageForInnerBack) },
      rightPage: { pageNum: -1, page: innerBack, label: 'Inner Back' },
      readingOrder: 9998,
      displayLabel: `Page ${lastEvenPageForInnerBack} + Inner Back`,
      canToggleSpread: !!(lastPageForInnerBack && innerBack),
    });
  } else if (!pagesInSpreads.has(-1)) {
    // No content pages, but still show Inner Back slot
    result.push({
      id: 'inner-back-spread',
      type: 'auto-paired',
      leftPage: { pageNum: 0, page: undefined, label: 'Empty' },
      rightPage: { pageNum: -1, page: innerBack, label: 'Inner Back' },
      readingOrder: 9998,
      displayLabel: 'Inner Back',
      canToggleSpread: false,
    });
  }
  
  // Sort by reading order
  result.sort((a, b) => a.readingOrder - b.readingOrder);
  
  return result;
}

/**
 * Calculate the total page count from spreads.
 * Each spread = 2 pages.
 */
export function calculatePageCount(spreads: PrintSpread[]): number {
  return spreads.length * 2;
}

/**
 * Ensure spreads result in a page count that's a multiple of 4.
 * Required for proper booklet printing (folded signatures).
 * Adds blank spreads as needed.
 */
export function padToMultipleOf4(spreads: PrintSpread[]): {
  paddedSpreads: PrintSpread[];
  blankSpreadsAdded: number;
} {
  const totalPages = calculatePageCount(spreads);
  const remainder = totalPages % 4;
  
  if (remainder === 0) {
    return { paddedSpreads: spreads, blankSpreadsAdded: 0 };
  }
  
  // Calculate how many pages we need to add
  const pagesToAdd = 4 - remainder;
  const spreadsToAdd = Math.ceil(pagesToAdd / 2);
  
  // Create padded spreads array
  const paddedSpreads = [...spreads];
  
  // Find where to insert blank spreads - before the inner back spread
  const innerBackIndex = paddedSpreads.findIndex(s => s.id === 'inner-back-spread');
  
  // Insert blank spreads before the inner back spread (or at the end if no inner back)
  const insertIndex = innerBackIndex >= 0 ? innerBackIndex : paddedSpreads.length;
  
  // Find the highest existing page number to continue numbering
  let maxExistingPage = 0;
  for (const spread of spreads) {
    if (spread.leftPage?.pageNum && spread.leftPage.pageNum > 0) {
      maxExistingPage = Math.max(maxExistingPage, spread.leftPage.pageNum);
    }
    if (spread.rightPage?.pageNum && spread.rightPage.pageNum > 0) {
      maxExistingPage = Math.max(maxExistingPage, spread.rightPage.pageNum);
    }
  }
  
  // Add blank spreads
  for (let i = 0; i < spreadsToAdd; i++) {
    const blankEvenPage = maxExistingPage + (i * 2) + 2;
    const blankOddPage = blankEvenPage + 1;
    
    paddedSpreads.splice(insertIndex + i, 0, {
      id: `blank-spread-${i}`,
      type: 'auto-paired',
      leftPage: { pageNum: blankEvenPage, label: `Blank ${blankEvenPage}` },
      rightPage: { pageNum: blankOddPage, label: `Blank ${blankOddPage}` },
      readingOrder: blankEvenPage,
      displayLabel: `Blank Pages ${blankEvenPage}-${blankOddPage}`,
      canToggleSpread: false,
    });
  }
  
  // Re-sort by reading order
  paddedSpreads.sort((a, b) => a.readingOrder - b.readingOrder);
  
  return { paddedSpreads, blankSpreadsAdded: spreadsToAdd };
}

/**
 * Build book pages for the book reader view.
 * Pages are ordered for READING (not printing):
 * - Front Cover first (appears on right of first spread)
 * - Inner Front, Page 1, Page 2, ... content pages
 * - Inner Back, Back Cover last
 */
export function buildBookPages(
  pages: BookletPageInfo[],
  spreads: SpreadInfo[]
): Array<{
  id: string;
  imageData: string;
  label: string;
  isBlank: boolean;
  isSpread?: boolean;
}> {
  const pageSlots = pages
    .filter((page) => page.parsedFile.pageNumber !== null)
    .map((page) => ({
      id: `page-${page.parsedFile.pageNumber}`,
      pageNumber: page.parsedFile.pageNumber!,
      imageUrl: page.imageData,
      label: getPageLabel(page.parsedFile.pageNumber!),
    }));

  const spreadSlots = spreads.map((spread) => ({
    id: `spread-${spread.pages[0]}-${spread.pages[1]}`,
    pages: spread.pages,
    imageUrl: spread.imageData,
  }));

  return buildBookletReadingPages(pageSlots, spreadSlots).map((page) => ({
    id: page.id,
    imageData: page.imageUrl,
    label: page.label,
    isBlank: page.isBlank,
    isSpread: page.isSpread,
  }));
}
