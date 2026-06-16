import { driveTrashFile } from '../../shared/drive/driveFetch';
import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import {
  addGestureDriveFileTombstones,
  addGestureDriveFolderTombstone,
} from './gestureDriveTombstones';
import { listImageFileIdsInPackFolderRecursive } from './gesturePackFolderListing';

async function deletePackLocalRows(packId: string, driveFolderId?: string): Promise<void> {
  const packFiles = await gestureDb.packFiles.where('packId').equals(packId).toArray();
  if (driveFolderId?.trim()) {
    addGestureDriveFolderTombstone(driveFolderId);
  }
  if (packFiles.length > 0) {
    addGestureDriveFileTombstones(packFiles.map((row) => row.driveFileId));
  }

  await removePackLocalRowsOnly(packId);
}

/** Remove Dexie rows for a pack without tombstones (Drive folder still exists elsewhere). */
async function removePackLocalRowsOnly(packId: string): Promise<void> {
  await gestureDb.transaction(
    'rw',
    [
      gestureDb.packs,
      gestureDb.packFiles,
      gestureDb.drawHistory,
      gestureDb.uploadManifestFiles,
      gestureDb.uploadStagingBlobs,
      gestureDb.uploadDirectoryHandles,
    ],
    async () => {
      await gestureDb.packFiles.where('packId').equals(packId).delete();
      await gestureDb.drawHistory.where('packId').equals(packId).delete();
      await gestureDb.uploadManifestFiles.where('packId').equals(packId).delete();
      await gestureDb.uploadStagingBlobs.where('packId').equals(packId).delete();
      await gestureDb.uploadDirectoryHandles.delete(packId);
      await gestureDb.packs.delete(packId);
    },
  );
  notifyGestureLocalChange({ immediate: true });
}

export async function removePackFromAppWithoutTombstones(packId: string): Promise<void> {
  await removePackLocalRowsOnly(packId);
}

export type DeleteCollectionScope = 'app-only' | 'app-and-drive-photos';

export type DeleteCollectionResult = {
  scope: DeleteCollectionScope;
  drivePhotosTrashed: number;
  folderTrashed: boolean;
};

export type DeleteCollectionProgress =
  | { phase: 'listing' }
  | { phase: 'trashing'; done: number; total: number }
  | { phase: 'finishing' };

const DRIVE_TRASH_CONCURRENCY = 8;

async function trashDriveFiles(
  accessToken: string,
  fileIds: string[],
  onProgress?: (progress: DeleteCollectionProgress) => void,
): Promise<void> {
  const total = fileIds.length;
  if (total === 0) return;

  let done = 0;
  onProgress?.({ phase: 'trashing', done, total });

  for (let i = 0; i < fileIds.length; i += DRIVE_TRASH_CONCURRENCY) {
    const batch = fileIds.slice(i, i + DRIVE_TRASH_CONCURRENCY);
    await Promise.all(
      batch.map(async (fileId) => {
        await driveTrashFile(accessToken, fileId);
        done += 1;
        onProgress?.({ phase: 'trashing', done, total });
      }),
    );
  }
}

/** Remove collection from Dexie only. Drive folder and photos stay. */
export async function deleteCollectionFromApp(packId: string): Promise<void> {
  const pack = await gestureDb.packs.get(packId);
  await deletePackLocalRows(packId, pack?.driveFolderId);
}

/** Remove from app and trash photos in the Drive folder plus the folder itself. */
export async function deleteCollectionAndDrivePhotos(
  accessToken: string,
  packId: string,
  onProgress?: (progress: DeleteCollectionProgress) => void,
): Promise<DeleteCollectionResult> {
  const pack = await gestureDb.packs.get(packId);
  if (!pack) throw new Error('Collection not found.');

  onProgress?.({ phase: 'listing' });
  const fileIds = pack.driveFolderId
    ? await listImageFileIdsInPackFolderRecursive(accessToken, pack.driveFolderId)
    : [];

  await trashDriveFiles(accessToken, fileIds, onProgress);

  let folderTrashed = false;
  if (pack.driveFolderId) {
    await driveTrashFile(accessToken, pack.driveFolderId);
    folderTrashed = true;
  }

  onProgress?.({ phase: 'finishing' });
  await deletePackLocalRows(packId, pack.driveFolderId);
  return {
    scope: 'app-and-drive-photos',
    drivePhotosTrashed: fileIds.length,
    folderTrashed,
  };
}
