import { zineboxDb } from './zineboxDb';

/**
 * Wipes Zine Box IndexedDB only (comics, stacks, local PDF blobs).
 * Does not touch localStorage or other Labs apps (Encore, Gesture, Google sign-in, etc.).
 */
export async function clearZineboxLocalData(): Promise<void> {
  await zineboxDb.transaction(
    'rw',
    zineboxDb.comics,
    zineboxDb.collections,
    zineboxDb.comicFiles,
    async () => {
      await zineboxDb.comics.clear();
      await zineboxDb.collections.clear();
      await zineboxDb.comicFiles.clear();
    },
  );
}
