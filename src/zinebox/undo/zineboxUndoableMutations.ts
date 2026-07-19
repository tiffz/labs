import type { LabsUndoCommit } from '../../shared/undo/labsUndoStack';
import {
  appendComicToStack,
  createStackFromComics,
  removeComicFromStack,
} from '../collections/stackMutations';
import { notifyZineboxLocalChange } from '../db/zineboxChangeBus';
import { zineboxDb } from '../db/zineboxDb';
import { deleteZineboxComic } from '../drive/deleteZineboxComic';
import {
  clearZineboxStackDeletion,
  clearZineboxStackMembershipRemoval,
  recordZineboxStackDeletion,
  recordZineboxStackMembershipRemoval,
} from '../drive/zineboxDriveStackTombstones';
import { removeZineboxComicTombstone } from '../drive/zineboxDriveTombstones';
import type { ZineboxCollection, ZineboxComic } from '../types';

/**
 * Undo-aware wrappers around Zinebox library mutations (Tier A undo).
 *
 * Each wrapper performs the mutation and returns a {@link LabsUndoCommit}
 * whose `undo` restores the prior Dexie rows *and* reverses the Drive
 * tombstones recorded by the forward path, so undone items do not get
 * re-deleted by the next sync merge.
 */

async function restoreCollection(collection: ZineboxCollection): Promise<void> {
  clearZineboxStackDeletion(collection.id);
  for (const comicId of collection.itemIds) {
    clearZineboxStackMembershipRemoval(collection.id, comicId);
  }
  await zineboxDb.collections.put(collection);
  notifyZineboxLocalChange({ immediate: true });
}

async function deleteCollectionWithTombstone(collectionId: string): Promise<void> {
  recordZineboxStackDeletion(collectionId);
  await zineboxDb.collections.delete(collectionId);
  notifyZineboxLocalChange({ immediate: true });
}

/** Delete a comic; undo restores the comic row, its cached file, and clears the tombstone. */
export async function deleteZineboxComicUndoable(
  comicId: string,
): Promise<LabsUndoCommit | null> {
  const comic = await zineboxDb.comics.get(comicId);
  if (!comic) return null;
  const file = await zineboxDb.comicFiles.get(comicId);
  const memberships = (await zineboxDb.collections.toArray()).filter((c) =>
    c.itemIds.includes(comicId),
  );

  await deleteZineboxComic(comicId);

  return {
    undo: async () => {
      removeZineboxComicTombstone(comicId);
      await zineboxDb.transaction('rw', zineboxDb.comics, zineboxDb.comicFiles, async () => {
        await zineboxDb.comics.put(comic);
        if (file) await zineboxDb.comicFiles.put(file);
      });
      for (const collection of memberships) {
        await restoreCollection(collection);
      }
      notifyZineboxLocalChange({ immediate: true });
    },
    redo: async () => {
      await deleteZineboxComic(comicId);
    },
  };
}

/** Remove one issue from a stack; undo restores the stack row (including a dissolved stack). */
export async function removeComicFromStackUndoable(
  collectionId: string,
  comicId: string,
  comicsById: ReadonlyMap<string, ZineboxComic>,
): Promise<LabsUndoCommit | null> {
  const before = await zineboxDb.collections.get(collectionId);
  if (!before) return null;

  await removeComicFromStack(collectionId, comicId, comicsById);

  return {
    undo: async () => {
      await restoreCollection(before);
    },
    redo: async () => {
      await removeComicFromStack(collectionId, comicId, comicsById);
    },
  };
}

/** Create a stack; undo deletes it (with deletion tombstone so sync drops it too). */
export async function createStackFromComicsUndoable(
  comics: readonly ZineboxComic[],
  comicsById: ReadonlyMap<string, ZineboxComic>,
  name?: string,
): Promise<{ collection: ZineboxCollection; commit: LabsUndoCommit }> {
  const collection = await createStackFromComics(comics, comicsById, name);
  return {
    collection,
    commit: {
      undo: async () => {
        await deleteCollectionWithTombstone(collection.id);
      },
      redo: async () => {
        await restoreCollection(collection);
      },
    },
  };
}

/** Add an issue to an existing stack; undo restores the prior stack row. */
export async function appendComicToStackUndoable(
  collection: ZineboxCollection,
  comicId: string,
  comicsById: ReadonlyMap<string, ZineboxComic>,
): Promise<LabsUndoCommit | null> {
  const before = await zineboxDb.collections.get(collection.id);
  if (!before || before.itemIds.includes(comicId)) return null;

  await appendComicToStack(collection, comicId, comicsById);
  const after = await zineboxDb.collections.get(collection.id);
  if (!after) return null;

  return {
    undo: async () => {
      // Record a removal tombstone so a synced append does not resurrect on merge.
      recordZineboxStackMembershipRemoval(collection.id, comicId);
      await restoreCollection(before);
    },
    redo: async () => {
      clearZineboxStackMembershipRemoval(collection.id, comicId);
      await restoreCollection(after);
    },
  };
}
