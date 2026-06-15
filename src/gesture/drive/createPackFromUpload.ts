import { driveCreateFolder } from '../../shared/drive/driveFetch';
import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import type { CreatePackFromUploadInput, GesturePack } from '../types';
import {
  ensureGestureReferencePacksLayout,
  ensureUniquePackFolderName,
} from './gestureDriveLayout';
import {
  defaultUploadCollectionName,
  filterGestureUploadImageFiles,
  sanitizePackFolderName,
} from './gesturePackMetadata';
import { uploadFilesToExistingPack, writeUploadManifest } from './gesturePackUpload';
import { resolveUploadCollectionName } from './gestureLocalFolderUpload';

export type CreatePackFromUploadResult = {
  pack: GesturePack;
  imageCount: number;
  skippedDuplicates: number;
};

export async function createPackFromUpload(
  accessToken: string,
  input: CreatePackFromUploadInput,
  onProgress?: (done: number, total: number) => void,
  onDuplicateCheck?: (hashed: number, total: number) => void,
  options?: { isCancelled?: (packId: string) => boolean },
): Promise<CreatePackFromUploadResult> {
  const images = filterGestureUploadImageFiles(input.files);
  if (images.length === 0) {
    throw new Error('Add at least one image file (JPEG, PNG, WebP, GIF, or similar).');
  }

  const layout = await ensureGestureReferencePacksLayout(accessToken);
  const folderTitle = sanitizePackFolderName(input.name?.trim() || defaultUploadCollectionName());
  const uniqueFolderName = await ensureUniquePackFolderName(
    accessToken,
    layout.referencePacksFolderId,
    folderTitle,
  );
  const folder = await driveCreateFolder(accessToken, uniqueFolderName, layout.referencePacksFolderId);

  const sourceFolderName = resolveUploadCollectionName(input.files, input.name);
  const now = new Date().toISOString();
  const pack: GesturePack = {
    id: crypto.randomUUID(),
    driveFolderId: folder.id,
    name: uniqueFolderName,
    linkedAt: now,
    lastIndexedAt: now,
    source: 'upload',
    uploadStatus: 'uploading',
    expectedFileCount: images.length,
    uploadedFileCount: 0,
    uploadSourceFolderName: sourceFolderName,
  };

  await gestureDb.packs.put(pack);
  await writeUploadManifest(pack.id, input.files);
  notifyGestureLocalChange();

  const result = await uploadFilesToExistingPack(
    accessToken,
    pack,
    images,
    onProgress,
    onDuplicateCheck,
    { isCancelled: options?.isCancelled },
  );
  return {
    pack: result.pack,
    imageCount: result.uploadedCount,
    skippedDuplicates: result.skippedDuplicates,
  };
}
