import { driveUploadFileResumable } from '../../shared/drive/driveFetch';
import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import type { GesturePack, GesturePackFile, GestureUploadManifestFile } from '../types';
import {
  collectionRelativePath,
  driveUploadBasename,
  gestureCollectionFileKey,
  subfolderSegments,
} from './gestureCollectionPaths';
import { collectPackContentFingerprintKeys } from './gestureDuplicateDetection';
import { GestureDriveFolderCache } from './gestureDriveFolderTree';
import { reconcileManifestWithDriveFolder } from './gestureManifestDriveReconcile';
import { filterUploadFilesSkippingDuplicates } from './gestureUploadDuplicateFilter';
import {
  buildUploadManifestId,
  localFileRelativePath,
  markManifestFileUploaded,
} from './gestureUploadManifest';
import { filterGestureUploadImageFiles } from './gesturePackMetadata';

function clearedUploadFields(pack: GesturePack): GesturePack {
  const next = { ...pack };
  delete next.uploadStatus;
  delete next.expectedFileCount;
  delete next.uploadedFileCount;
  delete next.uploadSourceFolderName;
  return next;
}

export async function clearUploadManifestForPack(packId: string): Promise<void> {
  await gestureDb.uploadManifestFiles.where('packId').equals(packId).delete();
}

export async function writeUploadManifest(
  packId: string,
  files: File[],
): Promise<GestureUploadManifestFile[]> {
  const images = filterGestureUploadImageFiles(files);
  const entries: GestureUploadManifestFile[] = images.map((file) => ({
    id: buildUploadManifestId(packId, localFileRelativePath(file)),
    packId,
    relativePath: localFileRelativePath(file),
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    status: 'pending',
  }));
  await gestureDb.uploadManifestFiles.bulkPut(entries);
  return entries;
}

/** Add manifest rows for new files without replacing an in-progress upload ledger. */
export async function appendUploadManifest(
  packId: string,
  files: File[],
): Promise<GestureUploadManifestFile[]> {
  const images = filterGestureUploadImageFiles(files);
  const existing = await gestureDb.uploadManifestFiles.where('packId').equals(packId).toArray();
  const existingPaths = new Set(existing.map((entry) => entry.relativePath));
  const entries: GestureUploadManifestFile[] = images
    .filter((file) => !existingPaths.has(localFileRelativePath(file)))
    .map((file) => ({
      id: buildUploadManifestId(packId, localFileRelativePath(file)),
      packId,
      relativePath: localFileRelativePath(file),
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      status: 'pending' as const,
    }));
  if (entries.length > 0) {
    await gestureDb.uploadManifestFiles.bulkPut(entries);
  }
  return entries;
}

export async function uploadFilesToExistingPack(
  accessToken: string,
  pack: GesturePack,
  files: File[],
  onProgress?: (done: number, total: number) => void,
  onDuplicateCheck?: (hashed: number, total: number) => void,
  options?: { collectionRootName?: string },
): Promise<{ pack: GesturePack; uploadedCount: number; total: number; skippedDuplicates: number }> {
  const allImages = filterGestureUploadImageFiles(files);
  if (allImages.length === 0) {
    throw new Error('No photos to upload.');
  }

  const collectionRoot = options?.collectionRootName ?? pack.uploadSourceFolderName;
  await reconcileManifestWithDriveFolder(accessToken, pack.id, pack.driveFolderId, collectionRoot);

  const packFilesExisting = await gestureDb.packFiles.where('packId').equals(pack.id).toArray();
  let manifest = await gestureDb.uploadManifestFiles.where('packId').equals(pack.id).toArray();
  const existingKeys = await collectPackContentFingerprintKeys(accessToken, pack.driveFolderId);
  const { toUpload: images, skippedDuplicates } = await filterUploadFilesSkippingDuplicates(
    allImages,
    {
      existingKeys,
      indexedDriveNames: new Set(packFilesExisting.map((row) => row.name)),
      collectionRootName: collectionRoot,
      uploadedManifestEntries: manifest,
      onProgress: onDuplicateCheck,
    },
  );

  if (images.length === 0) {
    return { pack, uploadedCount: 0, total: 0, skippedDuplicates };
  }

  let current: GesturePack = {
    ...pack,
    uploadStatus: 'uploading',
    expectedFileCount: pack.expectedFileCount ?? images.length,
    uploadedFileCount: pack.uploadedFileCount ?? 0,
  };
  await gestureDb.packs.put(current);

  const manifestByPath = new Map(manifest.map((entry) => [entry.relativePath, entry]));
  const packFileByKey = new Map(packFilesExisting.map((row) => [row.name, row]));
  const folderCache = new GestureDriveFolderCache(accessToken, pack.driveFolderId);

  const alreadyDone = manifest.filter((entry) => entry.status === 'uploaded').length;
  const total =
    manifest.length > 0 ? manifest.length : Math.max(current.expectedFileCount ?? 0, alreadyDone + images.length);
  let done = alreadyDone;
  let newlyUploaded = 0;

  onProgress?.(done, total);

  const pendingPackFiles: GesturePackFile[] = [];
  let lastPackProgressWriteAt = 0;

  const flushPackProgress = async (force = false) => {
    const now = Date.now();
    if (!force && done % 20 !== 0 && now - lastPackProgressWriteAt < 800) return;
    lastPackProgressWriteAt = now;
    await gestureDb.packs.put(current);
  };

  const flushPendingPackFiles = async () => {
    if (pendingPackFiles.length === 0) return;
    const batch = pendingPackFiles.splice(0, pendingPackFiles.length);
    await gestureDb.packFiles.bulkPut(batch);
  };

  try {
    for (const file of images) {
      const fileKey = gestureCollectionFileKey(file, collectionRoot);
      const entry = manifestByPath.get(localFileRelativePath(file));

      if (entry?.status === 'uploaded' && entry.driveFileId) {
        done += 1;
        current = { ...current, uploadedFileCount: done, expectedFileCount: total };
        await flushPackProgress();
        onProgress?.(done, total);
        continue;
      }

      const existingOnDrive = packFileByKey.get(fileKey);
      if (existingOnDrive) {
        await markManifestFileUploaded(pack.id, file, existingOnDrive.driveFileId);
        done += 1;
        current = { ...current, uploadedFileCount: done, expectedFileCount: total };
        await flushPackProgress();
        onProgress?.(done, total);
        continue;
      }

      const relWithinCollection = collectionRelativePath(file, collectionRoot);
      const parentId = await folderCache.resolveParentId(subfolderSegments(relWithinCollection));
      const driveBasename = driveUploadBasename(file, collectionRoot);
      const uploaded = await driveUploadFileResumable(
        accessToken,
        file,
        [parentId],
        driveBasename,
      );
      const packFile: GesturePackFile = {
        driveFileId: uploaded.id,
        packId: pack.id,
        name: fileKey,
        mimeType: file.type || 'image/jpeg',
      };
      pendingPackFiles.push(packFile);
      if (pendingPackFiles.length >= 25) {
        await flushPendingPackFiles();
      }
      packFileByKey.set(fileKey, packFile);
      await markManifestFileUploaded(pack.id, file, uploaded.id);

      newlyUploaded += 1;
      done += 1;
      current = { ...current, uploadedFileCount: done, expectedFileCount: total };
      await flushPackProgress();
      onProgress?.(done, total);
    }

    await flushPendingPackFiles();
    await flushPackProgress(true);
  } catch (e) {
    await flushPendingPackFiles();
    await flushPackProgress(true);
    current = { ...current, uploadStatus: 'incomplete' };
    await gestureDb.packs.put(current);
    notifyGestureLocalChange({ immediate: true });
    throw e;
  }

  manifest = await gestureDb.uploadManifestFiles.where('packId').equals(pack.id).toArray();
  const pendingLeft = manifest.filter((entry) => entry.status === 'pending').length;

  if (pendingLeft === 0) {
    current = clearedUploadFields({ ...current, lastIndexedAt: new Date().toISOString() });
    await gestureDb.packs.put(current);
    await clearUploadManifestForPack(pack.id);
  } else {
    current = { ...current, uploadStatus: 'incomplete', lastIndexedAt: new Date().toISOString() };
    await gestureDb.packs.put(current);
  }

  notifyGestureLocalChange({ immediate: true });
  return { pack: current, uploadedCount: newlyUploaded, total, skippedDuplicates };
}

export { clearedUploadFields };
