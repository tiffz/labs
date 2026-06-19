import { describe, expect, it } from 'vitest';

import { getReaderPrefetchPages } from './readerPageCache';

describe('getReaderPrefetchPages', () => {
  it('prefetches adjacent pages in single mode', () => {
    expect(getReaderPrefetchPages('single', 5, 10, 0).sort((a, b) => a - b)).toEqual([4, 6, 7]);
  });

  it('clamps prefetch at document bounds', () => {
    expect(getReaderPrefetchPages('single', 1, 10, 0)).toEqual([2, 3]);
    expect(getReaderPrefetchPages('single', 10, 10, 0)).toEqual([9]);
  });

  it('prefetches spread neighbors around the current spread', () => {
    const pages = getReaderPrefetchPages('spread', 4, 12, 0);
    expect(pages).toContain(3);
    expect(pages).toContain(5);
    expect(pages).toContain(6);
  });
});
