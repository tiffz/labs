import { driveGetFileMetadata } from '../../shared/drive/driveFetch';
import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import type { GesturePack } from '../types';
import {
  driveRowsToPackFiles,
  indexGesturePackFromDrive,
  listImagesInGesturePackFolder,
} from './gesturePackIndex';
import { parseDriveFolderIdFromInput } from './parseDriveFolderInput';
import { clearGestureDriveFolderTombstone } from './gestureDriveTombstones';

const FOLDER_MIME = 'application/vnd.google-apps.folder';

export type LinkPackFolderResult = {
  pack: GesturePack;
  imageCount: number;
};

export async function linkPackFolderFromInput(
  accessToken: string,
  input: string,
): Promise<LinkPackFolderResult> {
  const folderId = parseDriveFolderIdFromInput(input);
  if (!folderId) throw new Error('Paste a Google Drive folder link or folder id.');

  const meta = await driveGetFileMetadata(accessToken, folderId, 'id,name,mimeType');
  if ((meta.mimeType ?? '').toLowerCase() !== FOLDER_MIME) {
    throw new Error('That link is not a Drive folder. Choose a folder that holds your reference photos.');
  }

  clearGestureDriveFolderTombstone(folderId);

  const existing = await gestureDb.packs.where('driveFolderId').equals(folderId).first();
  const now = new Date().toISOString();
  const pack: GesturePack = existing
    ? { ...existing, name: meta.name?.trim() || existing.name, lastIndexedAt: now, source: existing.source ?? 'link' }
    : {
        id: crypto.randomUUID(),
        driveFolderId: folderId,
        name: meta.name?.trim() || 'Reference pack',
        linkedAt: now,
        lastIndexedAt: now,
        source: 'link',
      };

  const images = await listImagesInGesturePackFolder(accessToken, folderId);
  const packFiles = driveRowsToPackFiles(pack, images);

  await gestureDb.transaction('rw', gestureDb.packs, gestureDb.packFiles, async () => {
    await gestureDb.packs.put(pack);
    const stale = await gestureDb.packFiles.where('packId').equals(pack.id).toArray();
    const freshIds = new Set(packFiles.map((f) => f.driveFileId));
    for (const row of stale) {
      if (!freshIds.has(row.driveFileId)) await gestureDb.packFiles.delete(row.driveFileId);
    }
    await gestureDb.packFiles.bulkPut(packFiles);
  });

  notifyGestureLocalChange();
  return { pack, imageCount: packFiles.length };
}

export async function refreshPackFolder(accessToken: string, packId: string): Promise<number> {
  const pack = await gestureDb.packs.get(packId);
  if (!pack) throw new Error('Pack not found.');
  return indexGesturePackFromDrive(accessToken, pack);
}
