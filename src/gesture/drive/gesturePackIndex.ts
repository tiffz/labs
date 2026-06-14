import { driveListFiles, type DriveFileListRow } from '../../shared/drive/driveFetch';
import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import type { GesturePack, GesturePackFile } from '../types';
import { isGestureReferenceImageFile } from './gestureImageFilter';

function escapeDriveQueryString(id: string): string {
  return id.replace(/'/g, "\\'");
}

export async function listImagesInGesturePackFolder(
  accessToken: string,
  folderId: string,
): Promise<DriveFileListRow[]> {
  const out: DriveFileListRow[] = [];
  let pageToken: string | undefined;
  const q = `'${escapeDriveQueryString(folderId)}' in parents and trashed=false`;
  const fields = 'nextPageToken,files(id,name,mimeType,modifiedTime)';
  do {
    const res = await driveListFiles(accessToken, q, fields, 100, pageToken);
    for (const file of res.files ?? []) {
      if (isGestureReferenceImageFile(file)) out.push(file);
    }
    pageToken = res.nextPageToken;
  } while (pageToken);
  return out;
}

export function driveRowsToPackFiles(pack: GesturePack, images: DriveFileListRow[]): GesturePackFile[] {
  return images
    .filter((f) => f.id)
    .map((f) => ({
      driveFileId: f.id!,
      packId: pack.id,
      name: f.name?.trim() || 'Photo',
      mimeType: f.mimeType ?? 'image/jpeg',
      modifiedTime: f.modifiedTime,
    }));
}

/** Lists Drive folder contents and writes packFiles for one pack. */
export async function indexGesturePackFromDrive(
  accessToken: string,
  pack: GesturePack,
): Promise<number> {
  const images = await listImagesInGesturePackFolder(accessToken, pack.driveFolderId);
  const packFiles = driveRowsToPackFiles(pack, images);
  const now = new Date().toISOString();

  await gestureDb.transaction('rw', gestureDb.packs, gestureDb.packFiles, async () => {
    await gestureDb.packs.put({ ...pack, lastIndexedAt: now });
    const stale = await gestureDb.packFiles.where('packId').equals(pack.id).toArray();
    const freshIds = new Set(packFiles.map((f) => f.driveFileId));
    for (const row of stale) {
      if (!freshIds.has(row.driveFileId)) await gestureDb.packFiles.delete(row.driveFileId);
    }
    if (packFiles.length > 0) await gestureDb.packFiles.bulkPut(packFiles);
  });

  notifyGestureLocalChange();
  return packFiles.length;
}

export type ReindexMissingPacksResult = {
  indexed: number;
  photoCount: number;
  errors: string[];
};

/** Re-list Drive folders for packs that have no indexed photos (post-sync fallback). */
export async function reindexGesturePacksMissingPhotos(
  accessToken: string,
): Promise<ReindexMissingPacksResult> {
  const packs = await gestureDb.packs.toArray();
  const allFiles = await gestureDb.packFiles.toArray();
  const countByPack = new Map<string, number>();
  for (const f of allFiles) {
    countByPack.set(f.packId, (countByPack.get(f.packId) ?? 0) + 1);
  }

  const needsIndex = packs.filter((p) => (countByPack.get(p.id) ?? 0) === 0);
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
