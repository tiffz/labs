import type { ZineboxCollection, ZineboxComic } from '../types';
import { summarizeStackCoverRead } from './zineboxCoverReadSummary';
import { collectionMatchesSearchQuery, comicMatchesSearchQuery } from './zineboxLibrarySearch';
import { comicMatchesReadFilter, type ZineboxLibraryReadFilter } from './zineboxReadFilter';
import { comicMatchesTagFilter } from './zineboxTags';

export type ZineboxLibraryParamsLike = {
  filter: ZineboxLibraryReadFilter;
  source: string | null;
  tag: string | null;
  q: string | null;
};

function stackComicsForCollection(
  collection: ZineboxCollection,
  comicsById: ReadonlyMap<string, ZineboxComic>,
): ZineboxComic[] {
  return collection.itemIds
    .map((id) => comicsById.get(id))
    .filter((comic): comic is ZineboxComic => comic != null);
}

export function collectionMatchesLibraryFilters(
  collection: ZineboxCollection,
  comicsById: ReadonlyMap<string, ZineboxComic>,
  params: ZineboxLibraryParamsLike,
): boolean {
  const stackComics = stackComicsForCollection(collection, comicsById);
  if (stackComics.length === 0) return false;

  const readSummary = summarizeStackCoverRead(stackComics);
  if (!comicMatchesReadFilter(readSummary, params.filter)) return false;

  if (params.source && !stackComics.some((comic) => comic.source === params.source)) {
    return false;
  }

  if (params.tag && !stackComics.some((comic) => comicMatchesTagFilter(comic, params.tag!))) {
    return false;
  }

  if (!collectionMatchesSearchQuery(collection, stackComics, params.q ?? '')) {
    return false;
  }

  return true;
}

export function comicMatchesLibraryFilters(
  comic: ZineboxComic,
  params: ZineboxLibraryParamsLike,
): boolean {
  if (!comicMatchesReadFilter(comic, params.filter)) return false;
  if (params.source && comic.source !== params.source) return false;
  if (params.tag && !comicMatchesTagFilter(comic, params.tag)) return false;
  if (!comicMatchesSearchQuery(comic, params.q ?? '')) return false;
  return true;
}
