import { collectionRelativePath } from './gestureCollectionPaths';
import { gestureDriveUploadFileNameFromRelativePath } from './gestureDriveUploadFileName';
import { markManifestFileUploaded } from './gestureUploadManifest';
import type { GesturePackFile } from '../types';
import { gestureDb } from '../db/gestureDb';
import { listImagesInGesturePackFolderRecursive } from './gesturePackFolderListing';

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

function pickSingleMatch<T>(rows: T[] | undefined): T | null {
  if (!rows || rows.length !== 1) return null;
  return rows[0] ?? null;
}

/**
 * Mark pending manifest rows as uploaded when matching files already exist on Drive
 * (e.g. upload succeeded but local manifest was not updated, or user refreshed mid-upload).
 */
export async function reconcileManifestWithDriveFolder(
  accessToken: string,
  packId: string,
  driveFolderId: string,
  collectionRootName?: string,
): Promise<number> {
  const manifest = await gestureDb.uploadManifestFiles.where('packId').equals(packId).toArray();
  const pending = manifest.filter((entry) => entry.status === 'pending');
  if (pending.length === 0) return 0;

  const driveImages = await listImagesInGesturePackFolderRecursive(accessToken, driveFolderId);
  const byRelativePath = new Map<string, { id: string; name: string }>();
  const byLegacyFlatName = new Map<string, { id: string; name: string }>();
  const byBasename = new Map<string, { id: string; name: string }[]>();

  for (const row of driveImages) {
    if (!row.id || !row.name) continue;
    const rel = row.relativePath || row.name;
    byRelativePath.set(rel, { id: row.id, name: row.name });
    byLegacyFlatName.set(
      gestureDriveUploadFileNameFromRelativePath(rel, row.name),
      { id: row.id, name: row.name },
    );
    const baseList = byBasename.get(row.name) ?? [];
    baseList.push({ id: row.id, name: row.name });
    byBasename.set(row.name, baseList);
  }

  let reconciled = 0;
  for (const entry of pending) {
    const withinCollection = collectionRelativePath(manifestEntryAsFile(entry), collectionRootName);
    const flattened = gestureDriveUploadFileNameFromRelativePath(entry.relativePath, entry.name);
    const match =
      byRelativePath.get(withinCollection) ??
      byRelativePath.get(entry.relativePath) ??
      byLegacyFlatName.get(flattened) ??
      pickSingleMatch(byBasename.get(entry.name));

    if (!match) continue;

    await markManifestFileUploaded(packId, manifestEntryAsFile(entry), match.id);

    const existing = await gestureDb.packFiles.get(match.id);
    if (!existing) {
      const packFile: GesturePackFile = {
        driveFileId: match.id,
        packId,
        name: withinCollection,
        mimeType: 'image/jpeg',
      };
      await gestureDb.packFiles.put(packFile);
    }
    reconciled += 1;
  }

  return reconciled;
}
