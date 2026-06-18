import { portfolioTombstoneIdSet } from '../../shared/drive/labsPortfolioDriveTombstones';
import { notifyZineboxLocalChange } from '../db/zineboxChangeBus';
import { zineboxDb } from '../db/zineboxDb';
import {
  listZineboxComicTombstones,
  mergeZineboxComicTombstonesFromRemote,
  recordZineboxComicTombstone,
} from './zineboxDriveTombstones';

/** Remove a comic locally and record a Drive tombstone so other devices drop it on merge. */
export async function deleteZineboxComic(comicId: string): Promise<void> {
  const id = comicId.trim();
  if (!id) return;
  recordZineboxComicTombstone(id);
  await zineboxDb.transaction('rw', zineboxDb.comics, zineboxDb.comicFiles, async () => {
    await zineboxDb.comics.delete(id);
    await zineboxDb.comicFiles.where('comicId').equals(id).delete();
  });
  notifyZineboxLocalChange({ immediate: true });
}

export function zineboxTombstoneComicIdsFromRemote(
  remoteDeletedComicIds: readonly { id: string; removedAt: string }[] | undefined,
): ReadonlySet<string> {
  const merged = mergeZineboxComicTombstonesFromRemote(remoteDeletedComicIds);
  return portfolioTombstoneIdSet(merged);
}

export function zineboxComicTombstonesForEnvelope() {
  return listZineboxComicTombstones();
}
