import { driveListFiles, driveTrashFile } from '../../shared/drive/driveFetch';
import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import { isGestureReferenceImageFile } from './gestureImageFilter';

function escapeDriveQueryString(id: string): string {
  return id.replace(/'/g, "\\'");
}

async function listImageFileIdsInFolder(accessToken: string, folderId: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  const q = `'${escapeDriveQueryString(folderId)}' in parents and trashed=false`;
  do {
    const res = await driveListFiles(accessToken, q, 'nextPageToken,files(id,mimeType)', 100, pageToken);
    for (const file of res.files ?? []) {
      if (file.id && isGestureReferenceImageFile(file)) ids.push(file.id);
    }
    pageToken = res.nextPageToken;
  } while (pageToken);
  return ids;
}

async function deletePackLocalRows(packId: string): Promise<void> {
  await gestureDb.transaction(
    'rw',
    gestureDb.packs,
    gestureDb.packFiles,
    gestureDb.drawHistory,
    gestureDb.uploadManifestFiles,
    async () => {
      await gestureDb.packFiles.where('packId').equals(packId).delete();
      await gestureDb.drawHistory.where('packId').equals(packId).delete();
      await gestureDb.uploadManifestFiles.where('packId').equals(packId).delete();
      await gestureDb.packs.delete(packId);
    },
  );
  notifyGestureLocalChange();
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
  await deletePackLocalRows(packId);
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
    ? await listImageFileIdsInFolder(accessToken, pack.driveFolderId)
    : [];

  await trashDriveFiles(accessToken, fileIds, onProgress);

  let folderTrashed = false;
  if (pack.driveFolderId) {
    await driveTrashFile(accessToken, pack.driveFolderId);
    folderTrashed = true;
  }

  onProgress?.({ phase: 'finishing' });
  await deletePackLocalRows(packId);
  return {
    scope: 'app-and-drive-photos',
    drivePhotosTrashed: fileIds.length,
    folderTrashed,
  };
}
