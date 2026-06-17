import { driveCreateFolder } from '../../shared/drive/driveFetch';
import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import type { CreatePackFromUploadInput, GesturePack } from '../types';
import {
  ensureGestureReferencePacksLayout,
  ensureUniquePackFolderName,
} from './gestureDriveLayout';
import { collectPackContentFingerprintKeys } from './gestureDuplicateDetection';
import {
  defaultUploadCollectionName,
  filterGestureUploadImageFiles,
  sanitizePackFolderName,
} from './gesturePackMetadata';
import { uploadFilesToExistingPack, writeUploadManifest } from './gesturePackUpload';
import { saveUploadDirectoryHandle } from './gestureUploadDirectoryHandle';
import { filterUploadFilesSkippingDuplicates } from './gestureUploadDuplicateFilter';
import { resolveUploadCollectionName } from './gestureLocalFolderUpload';

export type CreatePackFromUploadResult = {
  pack: GesturePack;
  imageCount: number;
  skippedDuplicates: number;
};

async function findExistingPackForFullDuplicateUpload(
  accessToken: string,
  images: File[],
  collectionRootName: string,
): Promise<GesturePack | null> {
  const packs = await gestureDb.packs.toArray();
  for (const pack of packs) {
    if (!pack.driveFolderId?.trim() || pack.uploadStatus === 'uploading') continue;
    const existingKeys = await collectPackContentFingerprintKeys(accessToken, pack.driveFolderId);
    const { toUpload, skippedDuplicates } = await filterUploadFilesSkippingDuplicates(images, {
      existingKeys,
      collectionRootName,
    });
    if (toUpload.length === 0 && skippedDuplicates === images.length) {
      const folderTitle = sanitizePackFolderName(collectionRootName);
      const nameMatches =
        pack.uploadSourceFolderName === collectionRootName ||
        pack.name === folderTitle ||
        pack.name === collectionRootName;
      if (nameMatches) return pack;
    }
  }
  return null;
}

export async function createPackFromUpload(
  accessToken: string,
  input: CreatePackFromUploadInput,
  onProgress?: (done: number, total: number) => void,
  onDuplicateCheck?: (hashed: number, total: number) => void,
  options?: {
    isCancelled?: (packId: string) => boolean;
    onNetworkWait?: (done: number, total: number) => void;
    directoryHandle?: FileSystemDirectoryHandle;
  },
): Promise<CreatePackFromUploadResult> {
  const images = filterGestureUploadImageFiles(input.files);
  if (images.length === 0) {
    throw new Error('Add at least one image file (JPEG, PNG, WebP, GIF, or similar).');
  }

  const sourceFolderName =
    resolveUploadCollectionName(input.files, input.name) ?? defaultUploadCollectionName();
  const existingPack = await findExistingPackForFullDuplicateUpload(
    accessToken,
    images,
    sourceFolderName,
  );
  if (existingPack) {
    const result = await uploadFilesToExistingPack(
      accessToken,
      existingPack,
      images,
      onProgress,
      onDuplicateCheck,
      { collectionRootName: sourceFolderName, isCancelled: options?.isCancelled, onNetworkWait: options?.onNetworkWait, directoryHandle: options?.directoryHandle },
    );
    return {
      pack: result.pack,
      imageCount: result.uploadedCount,
      skippedDuplicates: result.skippedDuplicates,
    };
  }

  const layout = await ensureGestureReferencePacksLayout(accessToken);
  const folderTitle = sanitizePackFolderName(input.name?.trim() || defaultUploadCollectionName());
  const uniqueFolderName = await ensureUniquePackFolderName(
    accessToken,
    layout.referencePacksFolderId,
    folderTitle,
  );
  const folder = await driveCreateFolder(accessToken, uniqueFolderName, layout.referencePacksFolderId);

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
  if (options?.directoryHandle) {
    await saveUploadDirectoryHandle(pack.id, options.directoryHandle);
  }
  notifyGestureLocalChange();

  const result = await uploadFilesToExistingPack(
    accessToken,
    pack,
    images,
    onProgress,
    onDuplicateCheck,
    { isCancelled: options?.isCancelled, onNetworkWait: options?.onNetworkWait, directoryHandle: options?.directoryHandle },
  );
  return {
    pack: result.pack,
    imageCount: result.uploadedCount,
    skippedDuplicates: result.skippedDuplicates,
  };
}
