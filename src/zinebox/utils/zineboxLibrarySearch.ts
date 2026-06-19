import type { ZineboxComic } from '../types';

export function normalizeZineboxSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function zineboxSearchTokens(rawQuery: string): string[] {
  const query = normalizeZineboxSearchQuery(rawQuery);
  if (!query) return [];
  return query.split(/\s+/).filter(Boolean);
}

export function comicMatchesSearchQuery(comic: ZineboxComic, rawQuery: string): boolean {
  const query = normalizeZineboxSearchQuery(rawQuery);
  if (!query) return true;

  const haystack = [
    comic.title,
    comic.source,
    comic.filename ?? '',
    ...(comic.tags ?? []),
  ]
    .join(' ')
    .toLowerCase();

  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

export function collectionMatchesSearchQuery(
  collection: { name: string },
  comics: readonly ZineboxComic[],
  rawQuery: string,
): boolean {
  const query = normalizeZineboxSearchQuery(rawQuery);
  if (!query) return true;
  if (collection.name.toLowerCase().includes(query)) return true;
  return comics.some((comic) => comicMatchesSearchQuery(comic, rawQuery));
}
