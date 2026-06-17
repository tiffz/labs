import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import type { GesturePack, GesturePackFile } from '../types';
import {
  listImagesInGesturePackFolderRecursive,
  type GesturePackDriveImage,
} from './gesturePackFolderListing';
import { getTombstonedFileIds } from './gestureDriveTombstones';
import { reconcileStaleGestureUploadPacks } from './reconcileStaleGestureUploadPacks';

/** @deprecated Use listImagesInGesturePackFolderRecursive — kept for flat-only callers. */
export async function listImagesInGesturePackFolder(
  accessToken: string,
  folderId: string,
): Promise<GesturePackDriveImage[]> {
  return listImagesInGesturePackFolderRecursive(accessToken, folderId);
}

export const GESTURE_PACK_COVER_COUNT = 4;

/** First N image file ids sorted by name — stable collection card covers. */
export function pickGesturePackCoverFileIds(
  packFiles: GesturePackFile[],
  limit = GESTURE_PACK_COVER_COUNT,
): string[] {
  return [...packFiles]
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    .slice(0, limit)
    .map((f) => f.driveFileId);
}

export function driveRowsToPackFiles(pack: GesturePack, images: GesturePackDriveImage[]): GesturePackFile[] {
  return images
    .filter((f) => f.id)
    .map((f) => ({
      driveFileId: f.id!,
      packId: pack.id,
      name: f.relativePath || f.name?.trim() || 'Photo',
      mimeType: f.mimeType ?? 'image/jpeg',
      modifiedTime: f.modifiedTime,
    }));
}

/** True when this pack should re-list its Drive folder (empty index or stale upload ledger). */
export function packNeedsPhotoReindex(pack: GesturePack, indexedPhotoCount: number): boolean {
  if (indexedPhotoCount === 0) return true;
  const indexedOnPack = pack.photoIndexCount ?? 0;
  if (indexedOnPack > 0 && indexedPhotoCount < indexedOnPack) return true;
  if (!pack.uploadStatus) return false;
  const expected = pack.expectedFileCount ?? 0;
  return expected > 0 && indexedPhotoCount < expected;
}

/** Fraction 0–1 while listing Drive images; null when count is unknown. */
export function gestureDriveIndexListingProgress(
  listedCount: number,
  photoIndexHint: number,
): number | null {
  if (listedCount <= 0) return null;
  if (photoIndexHint > 0) {
    return Math.min(0.95, listedCount / photoIndexHint);
  }
  return Math.min(0.9, listedCount / (listedCount + 80));
}

/** Lists Drive folder contents and writes packFiles for one pack. */
export async function indexGesturePackFromDrive(
  accessToken: string,
  pack: GesturePack,
  options?: { onProgress?: (fraction: number | null) => void },
): Promise<number> {
  const tombstonedFileIds = getTombstonedFileIds();
  const photoIndexHint = pack.photoIndexCount ?? 0;
  options?.onProgress?.(null);
  const images = (
    await listImagesInGesturePackFolderRecursive(accessToken, pack.driveFolderId, {
      onListedCount: (count) => {
        options?.onProgress?.(gestureDriveIndexListingProgress(count, photoIndexHint));
      },
    })
  ).filter((image) => !image.id || !tombstonedFileIds.has(image.id));
  options?.onProgress?.(0.96);
  const packFiles = driveRowsToPackFiles(pack, images);
  const coverFileIds = pickGesturePackCoverFileIds(packFiles);
  const now = new Date().toISOString();

  await gestureDb.transaction('rw', gestureDb.packs, gestureDb.packFiles, async () => {
    await gestureDb.packs.put({
      ...pack,
      coverFileIds,
      photoIndexCount: packFiles.length,
      lastIndexedAt: now,
    });
    const stale = await gestureDb.packFiles.where('packId').equals(pack.id).toArray();
    const freshIds = new Set(packFiles.map((f) => f.driveFileId));
    for (const row of stale) {
      if (!freshIds.has(row.driveFileId)) await gestureDb.packFiles.delete(row.driveFileId);
    }
    if (packFiles.length > 0) await gestureDb.packFiles.bulkPut(packFiles);
  });

  notifyGestureLocalChange();
  await reconcileStaleGestureUploadPacks();
  options?.onProgress?.(1);
  return packFiles.length;
}

export type ReindexMissingPacksResult = {
  indexed: number;
  photoCount: number;
  errors: string[];
};

/** Re-list Drive folders for packs missing photos or stuck below an expected upload total. */
export async function reindexGesturePacksMissingPhotos(
  accessToken: string,
): Promise<ReindexMissingPacksResult> {
  const packs = await gestureDb.packs.toArray();
  const allFiles = await gestureDb.packFiles.toArray();
  const countByPack = new Map<string, number>();
  for (const f of allFiles) {
    countByPack.set(f.packId, (countByPack.get(f.packId) ?? 0) + 1);
  }

  const needsIndex = packs.filter((pack) =>
    packNeedsPhotoReindex(pack, countByPack.get(pack.id) ?? 0),
  );
  let photoCount = 0;
  const errors: string[] = [];

  for (const pack of needsIndex) {
    try {
      photoCount += await indexGesturePackFromDrive(accessToken, pack);
    } catch (e) {
      errors.push(
        `${pack.name}: ${e instanceof Error ? e.message : 'Could not list photos from Drive.'}`,
      );
    }
  }

  return { indexed: needsIndex.length, photoCount, errors };
}
