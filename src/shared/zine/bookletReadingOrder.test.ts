import { describe, expect, it } from 'vitest';

import { buildBookletReadingPages } from './bookletReadingOrder';

describe('buildBookletReadingPages', () => {
  it('starts with a blank page so the front cover appears on the right', () => {
    const pages = buildBookletReadingPages(
      [{ id: 'front', pageNumber: 0, imageUrl: 'front', label: 'Front Cover' }],
      [],
    );

    expect(pages[0]?.isBlank).toBe(true);
    expect(pages[1]?.label).toBe('Front Cover');
  });

  it('uses explicit outer cover spreads once', () => {
    const pages = buildBookletReadingPages(
      [],
      [{ id: 'outer', pages: [-2, 0], imageUrl: 'outer' }],
    );

    const spread = pages.find((page) => page.isSpread);
    expect(spread?.imageUrl).toBe('outer');
    expect(pages.some((page) => page.id === 'page-0')).toBe(false);
  });
});
