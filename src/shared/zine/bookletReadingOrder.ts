import { getBookletPageLabel } from './bookletPageLabels';

/**
 * Calculate the required number of content pages to make the total booklet
 * a multiple of 4 (required for proper booklet folding).
 */
export function calculateRequiredContentPages(uploadedMaxPage: number): number {
  if (uploadedMaxPage <= 0) return 0;
  return Math.ceil(uploadedMaxPage / 4) * 4;
}

export type BookletPageSlot = {
  id: string;
  pageNumber: number;
  imageUrl: string;
  label: string;
};

export type BookletExplicitSpread = {
  id: string;
  pages: [number, number];
  imageUrl: string;
};

export type BookletReadingPage = {
  id: string;
  imageUrl: string;
  label: string;
  isBlank: boolean;
  isSpread?: boolean;
};

/**
 * Build booklet pages for READING order (Zine Studio book preview).
 * - Front cover appears on the right of the first spread (blank left)
 * - Inner front, content pages, inner back, back cover follow
 */
export function buildBookletReadingPages(
  pages: readonly BookletPageSlot[],
  spreads: readonly BookletExplicitSpread[],
): BookletReadingPage[] {
  const bookPages: BookletReadingPage[] = [];

  const pageMap = new Map<number, BookletPageSlot>();
  for (const page of pages) {
    pageMap.set(page.pageNumber, page);
  }

  const pagesInSpreads = new Set<number>();
  const spreadMap = new Map<number, BookletExplicitSpread>();
  for (const spread of spreads) {
    pagesInSpreads.add(spread.pages[0]);
    pagesInSpreads.add(spread.pages[1]);
    spreadMap.set(spread.pages[0], spread);
    spreadMap.set(spread.pages[1], spread);
  }

  const getSpreadForPage = (pageNum: number): BookletExplicitSpread | undefined => {
    if (!pagesInSpreads.has(pageNum)) return undefined;
    return spreadMap.get(pageNum);
  };

  const addedSpreads = new Set<string>();

  const addPage = (pageNum: number, label: string): void => {
    const spread = getSpreadForPage(pageNum);
    if (spread) {
      const spreadId = `spread-${spread.pages[0]}-${spread.pages[1]}`;
      if (!addedSpreads.has(spreadId)) {
        addedSpreads.add(spreadId);
        bookPages.push({
          id: spreadId,
          imageUrl: spread.imageUrl,
          label: `${getBookletPageLabel(spread.pages[0])} – ${getBookletPageLabel(spread.pages[1])}`,
          isBlank: false,
          isSpread: true,
        });
        bookPages.push({
          id: `${spreadId}-placeholder`,
          imageUrl: '',
          label: '',
          isBlank: true,
        });
      }
      return;
    }

    const page = pageMap.get(pageNum);
    bookPages.push({
      id: page?.id ?? `page-${pageNum}`,
      imageUrl: page?.imageUrl ?? '',
      label,
      isBlank: !page,
    });
  };

  bookPages.push({ id: 'blank-start', imageUrl: '', label: '', isBlank: true });

  addPage(0, 'Front Cover');
  addPage(-0.5, 'Inner Front');
  addPage(1, 'Page 1');

  let uploadedMaxPage = 1;
  for (const page of pages) {
    if (page.pageNumber > uploadedMaxPage) uploadedMaxPage = page.pageNumber;
  }
  for (const spread of spreads) {
    if (spread.pages[0] > 0) uploadedMaxPage = Math.max(uploadedMaxPage, spread.pages[0]);
    if (spread.pages[1] > 0) uploadedMaxPage = Math.max(uploadedMaxPage, spread.pages[1]);
  }

  const maxPage = calculateRequiredContentPages(uploadedMaxPage);

  for (let i = 2; i <= maxPage; i++) {
    addPage(i, `Page ${i}`);
  }

  addPage(-1, 'Inner Back');
  addPage(-2, 'Back Cover');

  if (bookPages.length % 2 !== 0) {
    bookPages.push({ id: 'blank-end', imageUrl: '', label: '', isBlank: true });
  }

  return bookPages;
}

/** Pair reading-order pages into left/right spread views. */
export function bookletReadingPagesToSpreadViews(
  pages: readonly BookletReadingPage[],
): Array<{
  id: string;
  left: BookletReadingPage;
  right?: BookletReadingPage;
  isSpread: boolean;
}> {
  const views: Array<{
    id: string;
    left: BookletReadingPage;
    right?: BookletReadingPage;
    isSpread: boolean;
  }> = [];

  for (let index = 0; index < pages.length; index += 2) {
    const left = pages[index]!;
    const right = pages[index + 1];

    if (left.isSpread) {
      views.push({ id: left.id, left, right: undefined, isSpread: true });
      continue;
    }

    if (right?.isSpread) {
      views.push({ id: right.id, left: right, right: undefined, isSpread: true });
      continue;
    }

    views.push({
      id: right ? `${left.id}__${right.id}` : left.id,
      left,
      right,
      isSpread: false,
    });
  }

  return views;
}
