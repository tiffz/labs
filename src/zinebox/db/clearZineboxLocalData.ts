import { zineboxDb } from './zineboxDb';
import { recordZineboxComicTombstones } from '../drive/zineboxDriveTombstones';

/**
 * Wipes Zine Box IndexedDB only (comics, stacks, local PDF blobs).
 * Does not touch localStorage or other Labs apps (Encore, Gesture, Google sign-in, etc.).
 * Comics that were backed up to Drive are tombstoned so they do not resurrect on the next pull.
 */
export async function clearZineboxLocalData(): Promise<void> {
  const comics = await zineboxDb.comics.toArray();
  const backedUpIds = comics.filter((c) => c.driveBackupFileId).map((c) => c.id);
  if (backedUpIds.length > 0) {
    recordZineboxComicTombstones(backedUpIds);
  }

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
