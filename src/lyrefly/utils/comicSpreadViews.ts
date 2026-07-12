import {
  buildBookletReadingPages,
  bookletReadingPagesToSpreadViews,
  type BookletExplicitSpread,
  type BookletPageSlot,
} from '../../shared/zine/bookletReadingOrder';
import { labelToBookletPageNumber, spreadLabelsToPagePair } from '../../shared/zine/bookletPageLabels';

export type ComicPreviewPage = {
  id: string;
  label: string;
  imageUrl: string;
  isSpread: boolean;
  isBlank?: boolean;
};

export type ComicSpreadView = {
  id: string;
  left: ComicPreviewPage;
  right?: ComicPreviewPage;
  isSpread: boolean;
  /** Blank left page with art on the right (opening cover). */
  isOpening?: boolean;
};

function toPreviewPage(
  slot: { id: string; label: string; imageUrl: string; isBlank: boolean; isSpread?: boolean },
): ComicPreviewPage {
  return {
    id: slot.id,
    label: slot.label,
    imageUrl: slot.imageUrl,
    isSpread: Boolean(slot.isSpread),
    isBlank: slot.isBlank,
  };
}

function lyreflyPagesToBookletInputs(pages: readonly ComicPreviewPage[]): {
  pageSlots: BookletPageSlot[];
  spreadSlots: BookletExplicitSpread[];
} {
  const pageSlots: BookletPageSlot[] = [];
  const spreadSlots: BookletExplicitSpread[] = [];
  const usedNumbers = new Set<number>();
  let nextFallbackPage = 1;

  const reserveNumber = (pageNumber: number): void => {
    usedNumbers.add(pageNumber);
    if (pageNumber >= nextFallbackPage) nextFallbackPage = pageNumber + 1;
  };

  for (const page of pages) {
    if (page.isSpread) {
      const pair = spreadLabelsToPagePair(page.label);
      if (pair) {
        spreadSlots.push({ id: page.id, pages: pair, imageUrl: page.imageUrl });
        reserveNumber(pair[0]);
        reserveNumber(pair[1]);
        continue;
      }
    }

    let pageNumber = labelToBookletPageNumber(page.label);
    if (pageNumber === null) {
      while (usedNumbers.has(nextFallbackPage)) nextFallbackPage += 1;
      pageNumber = nextFallbackPage;
      nextFallbackPage += 1;
    }
    reserveNumber(pageNumber);
    pageSlots.push({
      id: page.id,
      pageNumber,
      imageUrl: page.imageUrl,
      label: page.label,
    });
  }

  return { pageSlots, spreadSlots };
}

/** Book-style spread views using Zine Studio booklet reading order. */
export function buildComicSpreadViews(pages: readonly ComicPreviewPage[]): ComicSpreadView[] {
  if (pages.length === 0) return [];

  const { pageSlots, spreadSlots } = lyreflyPagesToBookletInputs(pages);
  const readingPages = buildBookletReadingPages(pageSlots, spreadSlots);

  return bookletReadingPagesToSpreadViews(readingPages).map((view) => {
    const left = toPreviewPage({
      id: view.left.id,
      label: view.left.label,
      imageUrl: view.left.imageUrl,
      isBlank: view.left.isBlank,
      isSpread: view.left.isSpread,
    });
    const right = view.right
      ? toPreviewPage({
          id: view.right.id,
          label: view.right.label,
          imageUrl: view.right.imageUrl,
          isBlank: view.right.isBlank,
          isSpread: view.right.isSpread,
        })
      : undefined;

    const isOpening = Boolean(left.isBlank && right && !right.isBlank && right.imageUrl);

    return {
      id: view.id,
      left,
      right,
      isSpread: view.isSpread,
      isOpening,
    };
  });
}
