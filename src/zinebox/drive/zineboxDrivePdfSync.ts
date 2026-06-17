import {
  driveCreateFolder,
  driveGetMediaArrayBuffer,
  driveListFiles,
  driveUploadFileResumable,
} from '../../shared/drive/driveFetch';
import { zineboxDb } from '../db/zineboxDb';
import type { ZineboxComic } from '../types';
import { ZINEBOX_DRIVE_COMICS_FOLDER } from './zineboxDriveEnvelope';

async function ensureComicsFolder(accessToken: string, appFolderId: string): Promise<string> {
  const q = `name='${ZINEBOX_DRIVE_COMICS_FOLDER.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${appFolderId}' in parents and trashed=false`;
  const list = await driveListFiles(accessToken, q);
  const existingId = (list.files?.[0] as { id?: string } | undefined)?.id;
  if (existingId) return existingId;
  const created = await driveCreateFolder(accessToken, ZINEBOX_DRIVE_COMICS_FOLDER, appFolderId);
  return created.id;
}

/** Upload local PDF blobs missing a portfolio `driveBackupFileId`. */
export async function uploadZineboxPdfsForBackup(
  accessToken: string,
  appFolderId: string,
  comics: readonly ZineboxComic[],
  onProgress?: (label: string) => void,
): Promise<void> {
  const comicsFolderId = await ensureComicsFolder(accessToken, appFolderId);
  const needingUpload = comics.filter((c) => c.storageKind !== 'sample' && !c.driveBackupFileId);
  let uploaded = 0;

  for (const comic of needingUpload) {
    const row = await zineboxDb.comicFiles.get(comic.id);
    if (!row?.blob || row.blob.size <= 0) continue;
    uploaded += 1;
    onProgress?.(`Uploading PDF ${uploaded} of ${needingUpload.length}: ${comic.title}`);
    const fileName = comic.filename?.trim() || `${comic.id}.pdf`;
    const file = new File([row.blob], fileName, { type: 'application/pdf' });
    const { id } = await driveUploadFileResumable(accessToken, file, [comicsFolderId], `${comic.id}.pdf`);
    await zineboxDb.comics.update(comic.id, { driveBackupFileId: id, storageKind: 'local' });
  }
}

/** Download PDFs referenced by backup metadata when missing locally. */
export async function downloadMissingZineboxPdfs(
  accessToken: string,
  comics: readonly ZineboxComic[],
  onProgress?: (label: string) => void,
): Promise<void> {
  const pending = comics.filter((c) => c.driveBackupFileId);
  let downloaded = 0;

  for (const comic of pending) {
    const fileId = comic.driveBackupFileId;
    if (!fileId) continue;
    const existing = await zineboxDb.comicFiles.get(comic.id);
    if (existing?.blob && existing.blob.size > 0) continue;
    downloaded += 1;
    onProgress?.(`Downloading PDF ${downloaded}: ${comic.title}`);
    const bytes = await driveGetMediaArrayBuffer(accessToken, fileId);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    await zineboxDb.comicFiles.put({ comicId: comic.id, blob });
    if (!comic.storageKind) {
      await zineboxDb.comics.update(comic.id, { storageKind: 'local' });
    }
  }
}
