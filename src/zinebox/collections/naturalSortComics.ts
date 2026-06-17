import type { ZineboxComic } from '../types';

export function extractIssueNumber(comic: Pick<ZineboxComic, 'filename' | 'title'>): number | null {
  const haystack = `${comic.filename ?? ''} ${comic.title}`;
  const match = haystack.match(/(\d+)/);
  if (!match) return null;
  const value = Number.parseInt(match[1] ?? '', 10);
  return Number.isFinite(value) ? value : null;
}

export function sortComicIdsNatural(
  comicsById: ReadonlyMap<string, ZineboxComic>,
  itemIds: readonly string[],
  customSortOrder?: readonly string[],
): string[] {
  if (customSortOrder && customSortOrder.length > 0) {
    const orderIndex = new Map(customSortOrder.map((id, index) => [id, index]));
    return [...itemIds].sort((a, b) => {
      const ai = orderIndex.get(a);
      const bi = orderIndex.get(b);
      if (ai !== undefined && bi !== undefined) return ai - bi;
      if (ai !== undefined) return -1;
      if (bi !== undefined) return 1;
      return a.localeCompare(b);
    });
  }

  return [...itemIds].sort((a, b) => {
    const comicA = comicsById.get(a);
    const comicB = comicsById.get(b);
    if (!comicA || !comicB) return a.localeCompare(b);

    const numA = extractIssueNumber(comicA);
    const numB = extractIssueNumber(comicB);
    if (numA !== null && numB !== null && numA !== numB) return numA - numB;
    if (numA !== null && numB === null) return -1;
    if (numA === null && numB !== null) return 1;
    return comicA.title.localeCompare(comicB.title);
  });
}
