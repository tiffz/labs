import { driveListFiles } from '../../shared/drive/driveFetch';
import { gestureDb } from '../db/gestureDb';
import { isGestureReferenceImageFile } from './gestureImageFilter';
import { gestureDriveUploadFileNameFromRelativePath } from './gestureDriveUploadFileName';
import { markManifestFileUploaded } from './gestureUploadManifest';
import type { GesturePackFile } from '../types';

function escapeDriveQueryString(id: string): string {
  return id.replace(/'/g, "\\'");
}

type DriveImageRow = { id: string; name: string };

async function listDriveImagesInFolder(accessToken: string, folderId: string): Promise<DriveImageRow[]> {
  const rows: DriveImageRow[] = [];
  let pageToken: string | undefined;
  const q = `'${escapeDriveQueryString(folderId)}' in parents and trashed=false`;
  do {
    const res = await driveListFiles(accessToken, q, 'nextPageToken,files(id,name,mimeType)', 100, pageToken);
    for (const file of res.files ?? []) {
      if (file.id && file.name && isGestureReferenceImageFile(file)) {
        rows.push({ id: file.id, name: file.name });
      }
    }
    pageToken = res.nextPageToken;
  } while (pageToken);
  return rows;
}

/**
 * Mark pending manifest rows as uploaded when matching files already exist on Drive
 * (e.g. upload succeeded but local manifest was not updated, or user refreshed mid-upload).
 */
export async function reconcileManifestWithDriveFolder(
  accessToken: string,
  packId: string,
  driveFolderId: string,
): Promise<number> {
  const manifest = await gestureDb.uploadManifestFiles.where('packId').equals(packId).toArray();
  const pending = manifest.filter((entry) => entry.status === 'pending');
  if (pending.length === 0) return 0;

  const driveImages = await listDriveImagesInFolder(accessToken, driveFolderId);
  const byExactName = new Map<string, DriveImageRow[]>();
  for (const row of driveImages) {
    const list = byExactName.get(row.name) ?? [];
    list.push(row);
    byExactName.set(row.name, list);
  }

  let reconciled = 0;
  for (const entry of pending) {
    const flattened = gestureDriveUploadFileNameFromRelativePath(entry.relativePath, entry.name);
    const match =
      pickSingleMatch(byExactName.get(flattened)) ??
      pickSingleMatch(byExactName.get(entry.name));

    if (!match) continue;

    await markManifestFileUploaded(packId, manifestEntryAsFile(entry), match.id);

    const existing = await gestureDb.packFiles.get(match.id);
    if (!existing) {
      const packFile: GesturePackFile = {
        driveFileId: match.id,
        packId,
        name: match.name,
        mimeType: 'image/jpeg',
      };
      await gestureDb.packFiles.put(packFile);
    }
    reconciled += 1;
  }

  return reconciled;
}

function pickSingleMatch(rows: DriveImageRow[] | undefined): DriveImageRow | null {
  if (!rows || rows.length !== 1) return null;
  return rows[0] ?? null;
}

/** Minimal File stand-in for markManifestFileUploaded (matches on relativePath + metadata). */
function manifestEntryAsFile(entry: {
  relativePath: string;
  name: string;
  size: number;
  lastModified: number;
}): File {
  const file = new File([], entry.name, { type: 'image/jpeg', lastModified: entry.lastModified });
  Object.defineProperty(file, 'webkitRelativePath', { value: entry.relativePath, configurable: true });
  Object.defineProperty(file, 'size', { value: entry.size, configurable: true });
  return file;
}
