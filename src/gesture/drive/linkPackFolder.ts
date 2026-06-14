import { driveGetFileMetadata, driveListFiles, type DriveFileListRow } from '../../shared/drive/driveFetch';
import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import type { GesturePack, GesturePackFile } from '../types';
import { isGestureReferenceImageFile } from './gestureImageFilter';
import { parseDriveFolderIdFromInput } from './parseDriveFolderInput';

const FOLDER_MIME = 'application/vnd.google-apps.folder';

function escapeDriveQueryString(id: string): string {
  return id.replace(/'/g, "\\'");
}

async function listImagesInFolder(accessToken: string, folderId: string): Promise<DriveFileListRow[]> {
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

  const images = await listImagesInFolder(accessToken, folderId);
  const packFiles: GesturePackFile[] = images
    .filter((f) => f.id)
    .map((f) => ({
      driveFileId: f.id!,
      packId: pack.id,
      name: f.name?.trim() || 'Photo',
      mimeType: f.mimeType ?? 'image/jpeg',
      modifiedTime: f.modifiedTime,
    }));

  await gestureDb.transaction('rw', gestureDb.packs, gestureDb.packFiles, async () => {
    await gestureDb.packs.put(pack);
    const stale = await gestureDb.packFiles.where('packId').equals(pack.id).toArray();
    const staleIds = new Set(stale.map((f) => f.driveFileId));
    const freshIds = new Set(packFiles.map((f) => f.driveFileId));
    for (const id of staleIds) {
      if (!freshIds.has(id)) await gestureDb.packFiles.delete(id);
    }
    await gestureDb.packFiles.bulkPut(packFiles);
  });

  notifyGestureLocalChange();
  return { pack, imageCount: packFiles.length };
}

export async function refreshPackFolder(accessToken: string, packId: string): Promise<number> {
  const pack = await gestureDb.packs.get(packId);
  if (!pack) throw new Error('Pack not found.');
  const result = await linkPackFolderFromInput(accessToken, pack.driveFolderId);
  return result.imageCount;
}
