import { describe, expect, it } from 'vitest';

import { buildComicSpreadViews } from './comicSpreadViews';

describe('buildComicSpreadViews', () => {
  it('opens with blank left and front cover on the right', () => {
    const views = buildComicSpreadViews([
      { id: 'front', label: 'Front Cover', imageUrl: 'front', isSpread: false },
      { id: 'p1', label: 'Page 1', imageUrl: 'one', isSpread: false },
    ]);

    expect(views[0]?.isOpening).toBe(true);
    expect(views[0]?.left.isBlank).toBe(true);
    expect(views[0]?.right?.label).toBe('Front Cover');
  });

  it('pairs content pages in reading order', () => {
    const views = buildComicSpreadViews([
      { id: 'front', label: 'Front Cover', imageUrl: 'front', isSpread: false },
      { id: 'p1', label: 'Page 1', imageUrl: 'one', isSpread: false },
      { id: 'p2', label: 'Page 2', imageUrl: 'two', isSpread: false },
      { id: 'p3', label: 'Page 3', imageUrl: 'three', isSpread: false },
      { id: 'p4', label: 'Page 4', imageUrl: 'four', isSpread: false },
    ]);

    const pageSpread = views.find((view) => view.left.label === 'Page 2' && view.right?.label === 'Page 3');
    expect(pageSpread).toBeDefined();
  });

  it('renders explicit cover spreads as a single wide spread', () => {
    const views = buildComicSpreadViews([
      {
        id: 'outer',
        label: 'Back Cover - Front Cover',
        imageUrl: 'outer',
        isSpread: true,
      },
      { id: 'p1', label: 'Page 1', imageUrl: 'one', isSpread: false },
    ]);

    const coverSpread = views.find((view) => view.isSpread);
    expect(coverSpread).toBeDefined();
    expect(coverSpread?.left.imageUrl).toBe('outer');
    expect(coverSpread?.right).toBeUndefined();
  });
});
