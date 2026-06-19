import { describe, expect, it } from 'vitest';

import {
  advanceSpreadPage,
  computePageFitScale,
  formatReaderPageCount,
  spreadNavigationState,
  spreadPageNumbers,
} from './pdfRender';

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
