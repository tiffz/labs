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
import { GestureUploadCancelledError, isGestureUploadCancelledError } from './gestureUploadCancellation';

async function assertUploadActive(
  packId: string,
  isCancelled?: (packId: string) => boolean,
): Promise<void> {
  if (isCancelled?.(packId)) {
    throw new GestureUploadCancelledError(packId);
  }
  const row = await gestureDb.packs.get(packId);
  if (!row) {
    throw new GestureUploadCancelledError(packId);
  }
}

function isUploadLedgerComplete(
  pack: GesturePack,
  indexedPhotoCount: number,
  manifestPendingCount: number,
  manifestTotal: number,
): boolean {
  if (!pack.uploadStatus) return false;
  const expected = pack.expectedFileCount ?? 0;
  if (expected > 0 && indexedPhotoCount >= expected) return true;
  if (manifestTotal > 0 && manifestPendingCount === 0) return true;
  return false;
}

async function syncManifestForSkippedDuplicates(
  packId: string,
  allImages: File[],
  toUpload: File[],
  collectionRoot: string | undefined,
  packFileByKey: Map<string, GesturePackFile>,
  manifestByPath: Map<string, GestureUploadManifestFile>,
): Promise<number> {
  const toUploadSet = new Set(toUpload);
  let marked = 0;
  for (const file of allImages) {
    if (toUploadSet.has(file)) continue;
    const entry = manifestByPath.get(localFileRelativePath(file));
    if (!entry || entry.status === 'uploaded') continue;
    const fileKey = gestureCollectionFileKey(file, collectionRoot);
    const existing = packFileByKey.get(fileKey);
    if (!existing) continue;
    await markManifestFileUploaded(packId, file, existing.driveFileId);
    manifestByPath.set(entry.relativePath, { ...entry, status: 'uploaded', driveFileId: existing.driveFileId });
    marked += 1;
  }
  return marked;
}

/** Clear upload flags when Drive + manifest agree the collection is complete. */
export async function finalizeGesturePackUploadIfComplete(
  accessToken: string,
  pack: GesturePack,
): Promise<GesturePack | null> {
  if (!pack.uploadStatus) return null;

  await reconcileManifestWithDriveFolder(
    accessToken,
    pack.id,
    pack.driveFolderId,
    pack.uploadSourceFolderName,
  );

  let manifest = await gestureDb.uploadManifestFiles.where('packId').equals(pack.id).toArray();
  const indexedPhotoCount = await gestureDb.packFiles.where('packId').equals(pack.id).count();
  const uploadedCount = manifest.filter((entry) => entry.status === 'uploaded').length;
  let pending = manifest.filter((entry) => entry.status === 'pending');

  if (pending.length > 0 && indexedPhotoCount > 0 && indexedPhotoCount === uploadedCount) {
    await gestureDb.uploadManifestFiles.bulkDelete(pending.map((entry) => entry.id));
    manifest = manifest.filter((entry) => entry.status === 'uploaded');
    pending = [];
  }

  if (!isUploadLedgerComplete(pack, indexedPhotoCount, pending.length, manifest.length)) {
    return null;
  }

  const cleared = clearedUploadFields({
    ...pack,
    lastIndexedAt: new Date().toISOString(),
  });
  await gestureDb.packs.put(cleared);
  await clearUploadManifestForPack(pack.id);
  notifyGestureLocalChange({ immediate: true });
  return cleared;
}

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
  options?: { collectionRootName?: string; isCancelled?: (packId: string) => boolean },
): Promise<{ pack: GesturePack; uploadedCount: number; total: number; skippedDuplicates: number }> {
  const allImages = filterGestureUploadImageFiles(files);
  if (allImages.length === 0) {
    throw new Error('No photos to upload.');
  }

  await assertUploadActive(pack.id, options?.isCancelled);

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
    const manifestByPath = new Map(manifest.map((entry) => [entry.relativePath, entry]));
    const packFileByKey = new Map(packFilesExisting.map((row) => [row.name, row]));
    await syncManifestForSkippedDuplicates(
      pack.id,
      allImages,
      images,
      collectionRoot,
      packFileByKey,
      manifestByPath,
    );
    const finalized = await finalizeGesturePackUploadIfComplete(accessToken, pack);
    if (finalized) {
      return { pack: finalized, uploadedCount: 0, total: 0, skippedDuplicates };
    }
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

  const markedSkipped = await syncManifestForSkippedDuplicates(
    pack.id,
    allImages,
    images,
    collectionRoot,
    packFileByKey,
    manifestByPath,
  );

  manifest = await gestureDb.uploadManifestFiles.where('packId').equals(pack.id).toArray();
  const alreadyDone = manifest.filter((entry) => entry.status === 'uploaded').length;
  const total =
    manifest.length > 0 ? manifest.length : Math.max(current.expectedFileCount ?? 0, alreadyDone + images.length);
  let done = alreadyDone;
  let newlyUploaded = 0;

  if (markedSkipped > 0) {
    current = { ...current, uploadedFileCount: done, expectedFileCount: total };
    await gestureDb.packs.put(current);
  }

  onProgress?.(done, total);

  const pendingPackFiles: GesturePackFile[] = [];
  let lastPackProgressWriteAt = 0;

  const flushPackProgress = async (force = false) => {
    await assertUploadActive(pack.id, options?.isCancelled);
    const now = Date.now();
    if (!force && done % 20 !== 0 && now - lastPackProgressWriteAt < 800) return;
    lastPackProgressWriteAt = now;
    await gestureDb.packs.put(current);
  };

  const flushPendingPackFiles = async () => {
    if (pendingPackFiles.length === 0) return;
    await assertUploadActive(pack.id, options?.isCancelled);
    const batch = pendingPackFiles.splice(0, pendingPackFiles.length);
    await gestureDb.packFiles.bulkPut(batch);
  };

  try {
    for (const file of images) {
      await assertUploadActive(pack.id, options?.isCancelled);
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
    if (isGestureUploadCancelledError(e)) {
      throw e;
    }
    await flushPendingPackFiles();
    const row = await gestureDb.packs.get(pack.id);
    if (row) {
      await flushPackProgress(true);
      current = { ...current, uploadStatus: 'incomplete' };
      await gestureDb.packs.put(current);
      notifyGestureLocalChange({ immediate: true });
    }
    throw e;
  }

  await assertUploadActive(pack.id, options?.isCancelled);

  manifest = await gestureDb.uploadManifestFiles.where('packId').equals(pack.id).toArray();
  const pendingLeft = manifest.filter((entry) => entry.status === 'pending').length;

  if (pendingLeft === 0) {
    current = clearedUploadFields({ ...current, lastIndexedAt: new Date().toISOString() });
    await gestureDb.packs.put(current);
    await clearUploadManifestForPack(pack.id);
  } else {
    const finalized = await finalizeGesturePackUploadIfComplete(accessToken, current);
    if (finalized) {
      current = finalized;
    } else {
      current = { ...current, uploadStatus: 'incomplete', lastIndexedAt: new Date().toISOString() };
      await gestureDb.packs.put(current);
    }
  }

  notifyGestureLocalChange({ immediate: true });
  return { pack: current, uploadedCount: newlyUploaded, total, skippedDuplicates };
}

export { clearedUploadFields };
