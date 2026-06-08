import { inferMediaMimeType } from '../../shared/drive/inferMediaMimeType';
import { resolveEncoreDriveMediaMime } from '../media/encorePlayableMedia';
import { encoreDb } from '../db/encoreDb';

export type OriginalTakeBlobRow = {
  id: string;
  songId: string;
  takeId: string;
  mimeType: string;
  blob: Blob;
  updatedAt: string;
};

export function originalTakeBlobKey(songId: string, takeId: string): string {
  return `${songId}:${takeId}`;
}

export async function saveOriginalTakeBlob(
  songId: string,
  takeId: string,
  file: File | Blob,
): Promise<void> {
  const mimeType = file instanceof File ? inferMediaMimeType(file) : (file.type || 'audio/mpeg');
  const row: OriginalTakeBlobRow = {
    id: originalTakeBlobKey(songId, takeId),
    songId,
    takeId,
    mimeType,
    blob: file instanceof File ? file : file,
    updatedAt: new Date().toISOString(),
  };
  await encoreDb.originalTakeBlobs.put(row);
}

export async function loadOriginalTakeBlob(
  key: string,
): Promise<{ blob: Blob; mimeType: string; fileNameHint?: string } | null> {
  const row = await encoreDb.originalTakeBlobs.get(key);
  if (!row) return null;
  return { blob: row.blob, mimeType: row.mimeType };
}

export async function hasOriginalTakeBlob(songId: string, takeId: string): Promise<boolean> {
  const row = await encoreDb.originalTakeBlobs.get(originalTakeBlobKey(songId, takeId));
  return row != null;
}

export async function deleteOriginalTakeBlob(songId: string, takeId: string): Promise<void> {
  await encoreDb.originalTakeBlobs.delete(originalTakeBlobKey(songId, takeId));
}

export async function loadOriginalTakeBlobArrayBuffer(key: string): Promise<ArrayBuffer> {
  const loaded = await loadOriginalTakeBlob(key);
  if (!loaded) throw new Error('Local take audio not found.');
  if (typeof loaded.blob.arrayBuffer === 'function') {
    return loaded.blob.arrayBuffer();
  }
  return new Response(loaded.blob).arrayBuffer();
}

export async function loadOriginalTakeObjectUrl(
  key: string,
  fileNameHint?: string,
): Promise<{ objectUrl: string; mimeType: string }> {
  const loaded = await loadOriginalTakeBlob(key);
  if (!loaded) throw new Error('Local take audio not found.');
  const mime = resolveEncoreDriveMediaMime({
    fileName: fileNameHint,
    mimeType: loaded.mimeType,
  });
  const blobMime = mime === 'application/octet-stream' ? 'audio/mpeg' : mime;
  const bytes = await loadOriginalTakeBlobArrayBuffer(key);
  const blob = new Blob([bytes], { type: blobMime });
  return { objectUrl: URL.createObjectURL(blob), mimeType: blobMime };
}
