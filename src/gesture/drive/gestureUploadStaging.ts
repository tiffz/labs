import { gestureDb } from '../db/gestureDb';
import type { GestureUploadStagingBlobRow } from '../types';
import { buildUploadManifestId, localFileRelativePath } from './gestureUploadManifest';

type FileWithRelativePath = File & { webkitRelativePath?: string };

function fileWithRelativePath(file: File, relativePath: string): File {
  if ((file as FileWithRelativePath).webkitRelativePath === relativePath) return file;
  const tagged = file as FileWithRelativePath;
  Object.defineProperty(tagged, 'webkitRelativePath', {
    value: relativePath,
    configurable: true,
    enumerable: true,
  });
  return tagged;
}

export async function putStagedUploadBlob(packId: string, file: File): Promise<void> {
  const relativePath = localFileRelativePath(file);
  const id = buildUploadManifestId(packId, relativePath);
  await gestureDb.uploadStagingBlobs.put({
    id,
    packId,
    relativePath,
    blob: file,
    mimeType: file.type || 'image/jpeg',
    byteSize: file.size,
    lastModified: file.lastModified,
    savedAt: Date.now(),
  });
}

export async function deleteStagedUploadBlob(packId: string, file: File): Promise<void> {
  const id = buildUploadManifestId(packId, localFileRelativePath(file));
  await gestureDb.uploadStagingBlobs.delete(id);
}

export async function clearUploadStagingForPack(packId: string): Promise<void> {
  await gestureDb.uploadStagingBlobs.where('packId').equals(packId).delete();
}

export async function countStagedUploadBytes(packId: string): Promise<number> {
  const rows = await gestureDb.uploadStagingBlobs.where('packId').equals(packId).toArray();
  return rows.reduce((sum, row) => sum + row.byteSize, 0);
}

export async function hasStagedUploadFiles(packId: string): Promise<boolean> {
  const count = await gestureDb.uploadStagingBlobs.where('packId').equals(packId).count();
  return count > 0;
}

/** Build File objects from staged blobs for pending manifest rows. */
export async function readStagedUploadFiles(packId: string): Promise<File[]> {
  const manifest = await gestureDb.uploadManifestFiles.where('packId').equals(packId).toArray();
  const pending = manifest.filter((row) => row.status === 'pending');
  if (pending.length === 0) return [];

  const files: File[] = [];
  for (const entry of pending) {
    const staged = await gestureDb.uploadStagingBlobs.get(entry.id);
    if (!staged) continue;
    const file = new File([staged.blob], entry.name, {
      type: staged.mimeType,
      lastModified: entry.lastModified,
    });
    files.push(fileWithRelativePath(file, entry.relativePath));
  }
  return files;
}

export async function stagedUploadRowsForPack(packId: string): Promise<GestureUploadStagingBlobRow[]> {
  return gestureDb.uploadStagingBlobs.where('packId').equals(packId).toArray();
}
