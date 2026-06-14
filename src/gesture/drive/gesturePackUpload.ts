import { driveUploadFileResumable } from '../../shared/drive/driveFetch';
import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import type { GesturePack, GesturePackFile, GestureUploadManifestFile } from '../types';
import { collectPackContentFingerprintKeys } from './gestureDuplicateDetection';
import {
  gestureDriveUploadFileName,
  gestureDriveUploadFileNameWithSuffix,
} from './gestureDriveUploadFileName';
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

function reserveUniqueDriveName(baseName: string, taken: Set<string>): string {
  let suffix = 1;
  while (taken.has(gestureDriveUploadFileNameWithSuffix(baseName, suffix))) {
    suffix += 1;
  }
  const unique = gestureDriveUploadFileNameWithSuffix(baseName, suffix);
  taken.add(unique);
  return unique;
}

export async function uploadFilesToExistingPack(
  accessToken: string,
  pack: GesturePack,
  files: File[],
  onProgress?: (done: number, total: number) => void,
  onDuplicateCheck?: (hashed: number, total: number) => void,
): Promise<{ pack: GesturePack; uploadedCount: number; total: number; skippedDuplicates: number }> {
  const allImages = filterGestureUploadImageFiles(files);
  if (allImages.length === 0) {
    throw new Error('No photos to upload.');
  }

  await reconcileManifestWithDriveFolder(accessToken, pack.id, pack.driveFolderId);

  const packFilesExisting = await gestureDb.packFiles.where('packId').equals(pack.id).toArray();
  let manifest = await gestureDb.uploadManifestFiles.where('packId').equals(pack.id).toArray();
  const existingKeys = await collectPackContentFingerprintKeys(accessToken, pack.driveFolderId);
  const { toUpload: images, skippedDuplicates } = await filterUploadFilesSkippingDuplicates(
    allImages,
    {
      existingKeys,
      indexedDriveNames: new Set(packFilesExisting.map((row) => row.name)),
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
  const packFileByName = new Map(packFilesExisting.map((row) => [row.name, row]));
  const takenDriveNames = new Set(packFilesExisting.map((row) => row.name));

  const alreadyDone = manifest.filter((entry) => entry.status === 'uploaded').length;
  const total =
    manifest.length > 0 ? manifest.length : Math.max(current.expectedFileCount ?? 0, alreadyDone + images.length);
  let done = alreadyDone;
  let newlyUploaded = 0;

  onProgress?.(done, total);

  try {
    for (const file of images) {
      const relativePath = localFileRelativePath(file);
      const entry = manifestByPath.get(relativePath);

      if (entry?.status === 'uploaded' && entry.driveFileId) {
        done += 1;
        current = { ...current, uploadedFileCount: done, expectedFileCount: total };
        await gestureDb.packs.put(current);
        onProgress?.(done, total);
        continue;
      }

      const driveName = reserveUniqueDriveName(gestureDriveUploadFileName(file), takenDriveNames);
      const existingOnDrive = packFileByName.get(driveName);
      if (existingOnDrive) {
        await markManifestFileUploaded(pack.id, file, existingOnDrive.driveFileId);
        done += 1;
        current = { ...current, uploadedFileCount: done, expectedFileCount: total };
        await gestureDb.packs.put(current);
        onProgress?.(done, total);
        continue;
      }

      const uploaded = await driveUploadFileResumable(
        accessToken,
        file,
        [pack.driveFolderId],
        driveName,
      );
      const packFile: GesturePackFile = {
        driveFileId: uploaded.id,
        packId: pack.id,
        name: driveName,
        mimeType: file.type || 'image/jpeg',
      };
      await gestureDb.packFiles.put(packFile);
      packFileByName.set(driveName, packFile);
      await markManifestFileUploaded(pack.id, file, uploaded.id);

      newlyUploaded += 1;
      done += 1;
      current = { ...current, uploadedFileCount: done, expectedFileCount: total };
      await gestureDb.packs.put(current);
      onProgress?.(done, total);
    }
  } catch (e) {
    current = { ...current, uploadStatus: 'incomplete' };
    await gestureDb.packs.put(current);
    notifyGestureLocalChange();
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

  notifyGestureLocalChange();
  return { pack: current, uploadedCount: newlyUploaded, total, skippedDuplicates };
}

export { clearedUploadFields };
