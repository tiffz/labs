import { describe, expect, it } from 'vitest';

import {
  advanceSpreadPage,
  formatReaderPageCount,
  spreadNavigationState,
  spreadPageNumbers,
} from './pdfRender';

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
