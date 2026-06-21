import { describe, expect, it } from 'vitest';

import {
  advanceSpreadPage,
  computePageFitScale,
  detectWideSpreadPageNumbers,
  formatReaderPageCount,
  spreadNavigationState,
  spreadPageNumbers,
  type PdfPageDimensions,
} from './pdfRender';

function portraitPage(width: number, height: number): PdfPageDimensions {
  return { width, height };
}

function landscapeSpread(width: number, height: number): PdfPageDimensions {
  return { width, height };
}

describe('wide spread detection', () => {
  it('flags pages much wider than portrait singles', () => {
    const dimensions: PdfPageDimensions[] = [
      portraitPage(400, 600),
      portraitPage(410, 600),
      landscapeSpread(820, 600),
      portraitPage(405, 600),
    ];
    expect([...detectWideSpreadPageNumbers(dimensions)]).toEqual([3]);
  });

  it('shows a built-in spread alone instead of pairing with its neighbor', () => {
    const wide = new Set([3]);
    expect(spreadPageNumbers(2, 148, 0, wide)).toEqual([2]);
    expect(spreadPageNumbers(3, 148, 0, wide)).toEqual([3]);
    expect(formatReaderPageCount('spread', 2, 148, 0, wide)).toBe('2 / 148');
    expect(formatReaderPageCount('spread', 3, 148, 0, wide)).toBe('3 / 148');
    expect(advanceSpreadPage(2, 1, 148, 0, wide)).toBe(3);
    expect(advanceSpreadPage(3, -1, 148, 0, wide)).toBe(2);
  });
});

describe('computePageFitScale', () => {
  it('contain fits tall pages within the viewport height', () => {
    const pageWidth = 800;
    const pageHeight = 2400;
    const containerWidth = 400;
    const containerHeight = 600;

    const widthScale = computePageFitScale('width', pageWidth, pageHeight, containerWidth, containerHeight);
    const containScale = computePageFitScale('contain', pageWidth, pageHeight, containerWidth, containerHeight);

    expect(pageHeight * widthScale).toBeGreaterThan(containerHeight);
    expect(pageHeight * containScale).toBeLessThanOrEqual(containerHeight);
    expect(pageWidth * containScale).toBeLessThanOrEqual(containerWidth);
  });
});

describe('spread reader chrome helpers', () => {
  it('shows a page range in spread mode', () => {
    expect(formatReaderPageCount('spread', 9, 61, 1)).toBe('9–10 / 61');
    expect(formatReaderPageCount('spread', 1, 61, 1)).toBe('1 / 61');
  });

  it('advances by whole spreads instead of single pages', () => {
    expect(spreadPageNumbers(9, 61, 1)).toEqual([9, 10]);
    expect(advanceSpreadPage(9, 1, 61, 1)).toBe(11);
    expect(spreadPageNumbers(11, 61, 1)).toEqual([11, 12]);
    expect(advanceSpreadPage(11, -1, 61, 1)).toBe(10);
    expect(spreadPageNumbers(10, 61, 1)).toEqual([9, 10]);
  });

  it('tracks spread navigation boundaries', () => {
    expect(spreadNavigationState(1, 61, 1)).toEqual({ canPrev: false, canNext: true });
    expect(spreadNavigationState(60, 61, 1)).toEqual({ canPrev: true, canNext: true });
    expect(spreadNavigationState(61, 61, 1)).toEqual({ canPrev: true, canNext: false });
  });
});
