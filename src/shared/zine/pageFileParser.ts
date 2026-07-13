/**
 * Parsed comic page upload (Zine Studio / Mixam filename conventions).
 * Shared across Zine Studio and Lyrefly art import.
 */
export interface ParsedPageFile {
  file: File;
  pageNumber: number | null;
  isSpread: boolean;
  spreadPages?: [number, number];
  displayName: string;
  originalName: string;
}

/**
 * Extracts page number from filename using naming conventions.
 * Handles flexible naming patterns:
 * - "page1.png", "page_1.png", "1.png" for single pages
 * - "file1.pdf", "page2.pdf" for numbered pages
 * - Special keywords: "front", "back", "rear", "last", "inner"
 */
export function extractPageNumber(filename: string): number | null {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').toLowerCase();

  const normalizedName = nameWithoutExt.replace(/_/g, '');

  if (normalizedName === 'cover' || normalizedName === 'frontcover') {
    return 0;
  }
  if (normalizedName === 'backcover' || (normalizedName.includes('back') && normalizedName.includes('cover'))) {
    return -2;
  }

  if (normalizedName.includes('inner') && normalizedName.includes('front')) {
    return -0.5;
  }
  if (normalizedName.includes('inner') && normalizedName.includes('back')) {
    return -1;
  }

  const keywordMap: Record<string, number> = {
    front: 0,
    inner: -1,
    back: -2,
    rear: -2,
    last: -3,
  };

  for (const [keyword, value] of Object.entries(keywordMap)) {
    if (normalizedName.includes(keyword)) {
      return value;
    }
  }

  const numberMatch = nameWithoutExt.match(/(\d+)/);
  if (numberMatch) {
    return parseInt(numberMatch[1], 10);
  }

  return null;
}

/**
 * Detects if a filename represents a double page spread.
 */
export function detectSpread(filename: string): { isSpread: boolean; pages?: [number, number] } {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').toLowerCase();

  const hyphenMatch = nameWithoutExt.match(/(?:page[_-]?)?(\d+)-(\d+)/);
  if (hyphenMatch) {
    const page1 = parseInt(hyphenMatch[1], 10);
    const page2 = parseInt(hyphenMatch[2], 10);
    if (page1 && page2 && page2 === page1 + 1) {
      return { isSpread: true, pages: [page1, page2] };
    }
  }

  const hasBack = nameWithoutExt.includes('back') || nameWithoutExt.includes('rear') || nameWithoutExt.includes('last');
  const hasFront = nameWithoutExt.includes('front');

  if (hasBack && hasFront) {
    const keywordKeywordMatch = nameWithoutExt.match(
      /(back|rear|last|outerback|outer_back)[_-](front|outerfront|outer_front)/,
    );
    if (keywordKeywordMatch) {
      return { isSpread: true, pages: [-2, 0] };
    }
  }

  const normalizedForNumberKeyword = nameWithoutExt
    .replace(/inner[_-]?front/gi, 'innerfront')
    .replace(/inner[_-]?back/gi, 'innerback')
    .replace(/inner[_-]?cover/gi, 'innercover');
  const numberKeywordMatch = normalizedForNumberKeyword.match(
    /(?:page[_-]?)?(\d+)[_-](innercover|innerback|innerfront|inner|back|front|cover)/,
  );
  if (numberKeywordMatch) {
    const pageNum = parseInt(numberKeywordMatch[1], 10);
    const keyword = numberKeywordMatch[2];

    if (keyword === 'innerfront' || (keyword.includes('inner') && keyword.includes('front'))) {
      return { isSpread: true, pages: [-0.5, pageNum] };
    }
    if (
      keyword === 'innerback' ||
      keyword === 'innercover' ||
      (keyword.includes('inner') && keyword.includes('back'))
    ) {
      return { isSpread: true, pages: [pageNum, -1] };
    }
    if (keyword === 'inner') {
      return { isSpread: true, pages: [pageNum, -1] };
    }
    if (keyword.includes('back')) {
      return { isSpread: true, pages: [pageNum, -2] };
    }
    if (keyword.includes('front')) {
      return { isSpread: true, pages: [-2, pageNum] };
    }
  }

  const normalizedForKeyword = nameWithoutExt
    .replace(/inner[_-]?front/gi, 'innerfront')
    .replace(/inner[_-]?back/gi, 'innerback')
    .replace(/inner[_-]?cover/gi, 'innercover');
  const keywordNumberMatch = normalizedForKeyword.match(
    /(innercover|innerback|innerfront|inner|back|front|cover)[_-](?:page[_-]?)?(\d+)/,
  );
  if (keywordNumberMatch) {
    const keyword = keywordNumberMatch[1];
    const pageNum = parseInt(keywordNumberMatch[2], 10);

    if (keyword === 'innerfront' || (keyword.includes('inner') && keyword.includes('front'))) {
      return { isSpread: true, pages: [-0.5, pageNum] };
    }
    if (
      keyword === 'innerback' ||
      keyword === 'innercover' ||
      (keyword.includes('inner') && keyword.includes('back'))
    ) {
      return { isSpread: true, pages: [pageNum, -1] };
    }
    if (keyword === 'inner') {
      return { isSpread: true, pages: [pageNum, -1] };
    }
    if (keyword.includes('back')) {
      return { isSpread: true, pages: [pageNum, -2] };
    }
    if (keyword.includes('front')) {
      return { isSpread: true, pages: [-2, pageNum] };
    }
  }

  const hasSpreadKeyword = nameWithoutExt.includes('spread');
  const hasHyphenBetweenNumbers = /page[_-]?\d+-\d+/.test(nameWithoutExt);

  if (hasSpreadKeyword || hasHyphenBetweenNumbers) {
    const numberMatches = nameWithoutExt.matchAll(/\d+/g);
    const numbers = Array.from(numberMatches).map((m) => parseInt(m[0], 10));

    for (let i = 0; i < numbers.length - 1; i++) {
      if (numbers[i + 1] === numbers[i] + 1) {
        return { isSpread: true, pages: [numbers[i], numbers[i + 1]] };
      }
    }

    if (hasSpreadKeyword && numbers.length === 1) {
      const numStr = numbers[0].toString();
      for (let splitPos = 1; splitPos < numStr.length; splitPos++) {
        const first = parseInt(numStr.substring(0, splitPos), 10);
        const second = parseInt(numStr.substring(splitPos), 10);
        if (second === first + 1 && second > 0 && first > 0) {
          return { isSpread: true, pages: [first, second] };
        }
      }
    }
  }

  if (!nameWithoutExt.includes('_')) {
    const numberMatches = nameWithoutExt.matchAll(/\d+/g);
    const numbers = Array.from(numberMatches).map((m) => parseInt(m[0], 10));

    for (let i = 0; i < numbers.length - 1; i++) {
      if (numbers[i + 1] === numbers[i] + 1) {
        return { isSpread: true, pages: [numbers[i], numbers[i + 1]] };
      }
    }

    if (numbers.length === 1) {
      const numStr = numbers[0].toString();
      for (let splitPos = 1; splitPos < numStr.length; splitPos++) {
        const first = parseInt(numStr.substring(0, splitPos), 10);
        const second = parseInt(numStr.substring(splitPos), 10);
        if (second === first + 1 && second > 0 && first > 0) {
          return { isSpread: true, pages: [first, second] };
        }
      }
    }
  }

  return { isSpread: false };
}

export function parsePageFile(file: File): ParsedPageFile {
  const pageNumber = extractPageNumber(file.name);
  const spreadInfo = detectSpread(file.name);

  return {
    file,
    pageNumber,
    isSpread: spreadInfo.isSpread,
    spreadPages: spreadInfo.pages,
    displayName: file.name,
    originalName: file.name,
  };
}

import { bookletReadingOrderKey } from './bookletPageLabels';

export function sortPageFilesByOrder(files: ParsedPageFile[]): ParsedPageFile[] {
  return [...files].sort((a, b) => {
    const aPage = a.isSpread && a.spreadPages ? a.spreadPages[0] : a.pageNumber;
    const bPage = b.isSpread && b.spreadPages ? b.spreadPages[0] : b.pageNumber;

    if (aPage === null && bPage === null) {
      return a.originalName.localeCompare(b.originalName);
    }
    if (aPage === null) return 1;
    if (bPage === null) return -1;

    const orderDiff = bookletReadingOrderKey(aPage) - bookletReadingOrderKey(bPage);
    if (orderDiff !== 0) return orderDiff;

    return a.originalName.localeCompare(b.originalName);
  });
}

export function parseAndSortPageFiles(files: File[]): ParsedPageFile[] {
  const parsed = files.map(parsePageFile);
  return sortPageFilesByOrder(parsed);
}
