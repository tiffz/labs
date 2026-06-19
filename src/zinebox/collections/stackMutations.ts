import { sortComicIdsNatural } from './naturalSortComics';
import { notifyZineboxLocalChange } from '../db/zineboxChangeBus';
import { zineboxDb } from '../db/zineboxDb';
import {
  clearZineboxStackMembershipRemoval,
  recordZineboxStackDeletion,
  recordZineboxStackMembershipRemoval,
} from '../drive/zineboxDriveStackTombstones';
import type { ZineboxCollection, ZineboxComic } from '../types';

function newCollectionId(): string {
  return `stack-${crypto.randomUUID()}`;
}

export async function createStackFromComics(
  comics: readonly ZineboxComic[],
  comicsById: ReadonlyMap<string, ZineboxComic>,
  name?: string,
): Promise<ZineboxCollection> {
  const itemIds = comics.map((comic) => comic.id);
  const customSortOrder = sortComicIdsNatural(comicsById, itemIds);
  const collection: ZineboxCollection = {
    id: newCollectionId(),
    name: name ?? `Stack · ${comics[0]?.title ?? 'Collection'}`,
    itemIds,
    customSortOrder,
  };
  await zineboxDb.collections.put(collection);
  notifyZineboxLocalChange({ immediate: true });
  return collection;
}

export async function appendComicToStack(
  collection: ZineboxCollection,
  comicId: string,
  comicsById: ReadonlyMap<string, ZineboxComic>,
): Promise<void> {
  if (collection.itemIds.includes(comicId)) return;
  clearZineboxStackMembershipRemoval(collection.id, comicId);
  const itemIds = [...collection.itemIds, comicId];
  const customSortOrder = sortComicIdsNatural(comicsById, itemIds, collection.customSortOrder);
  await zineboxDb.collections.update(collection.id, { itemIds, customSortOrder });
  notifyZineboxLocalChange({ immediate: true });
}

/** Remove one issue from a stack. Dissolves the stack when one issue remains. */
export async function removeComicFromStack(
  collectionId: string,
  comicId: string,
  comicsById: ReadonlyMap<string, ZineboxComic>,
): Promise<void> {
  const collection = await zineboxDb.collections.get(collectionId);
  if (!collection) return;

  const itemIds = collection.itemIds.filter((id) => id !== comicId);
  recordZineboxStackMembershipRemoval(collectionId, comicId);
  if (itemIds.length <= 1) {
    recordZineboxStackDeletion(collectionId);
    await zineboxDb.collections.delete(collectionId);
    notifyZineboxLocalChange({ immediate: true });
    return;
  }

  const customSortOrder = sortComicIdsNatural(comicsById, itemIds, collection.customSortOrder);
  await zineboxDb.collections.update(collectionId, {
    itemIds,
    customSortOrder,
  });
  notifyZineboxLocalChange({ immediate: true });
}

export async function removeComicFromAllStacks(comicId: string): Promise<void> {
  const collections = await zineboxDb.collections.toArray();
  const comics = await zineboxDb.comics.toArray();
  const comicsById = new Map(comics.map((comic) => [comic.id, comic]));

  for (const collection of collections) {
    if (!collection.itemIds.includes(comicId)) continue;
    await removeComicFromStack(collection.id, comicId, comicsById);
  }
}
