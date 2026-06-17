import { useLiveQuery } from 'dexie-react-hooks';

import { resolveDexieLiveQuery } from '../../shared/dexie/resolveDexieLiveQuery';
import { zineboxDb } from '../db/zineboxDb';
import type { ZineboxCollection } from '../types';

export function useZineboxComics(): {
  comics: import('../types').ZineboxComic[];
  comicsHydrated: boolean;
} {
  const raw = useLiveQuery(() => zineboxDb.comics.toArray(), []);
  const { value, hydrated } = resolveDexieLiveQuery(raw, []);
  return { comics: value, comicsHydrated: hydrated };
}

export function useZineboxCollections(): {
  collections: ZineboxCollection[];
  collectionsHydrated: boolean;
} {
  const raw = useLiveQuery(() => zineboxDb.collections.toArray(), []);
  const { value, hydrated } = resolveDexieLiveQuery(raw, []);
  return { collections: value, collectionsHydrated: hydrated };
}

export function useZineboxComic(comicId: string | null): {
  comic: import('../types').ZineboxComic | null;
  comicHydrated: boolean;
} {
  const raw = useLiveQuery(
    () => (comicId ? zineboxDb.comics.get(comicId) : undefined),
    [comicId],
  );
  const { value, hydrated } = resolveDexieLiveQuery(raw, undefined);
  return { comic: value ?? null, comicHydrated: hydrated };
}
