import { inferMediaMimeType } from '../../shared/drive/inferMediaMimeType';
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

/**
 * Drop every cached take blob for one original.
 *
 * Call this wherever an original row goes away for good. Blob rows are keyed `songId:takeId` and
 * are only ever removed per-take otherwise, so deleting a song used to orphan its audio in
 * IndexedDB forever — tens of MB per take, never reclaimed.
 */
export async function deleteOriginalTakeBlobsForSong(songId: string): Promise<void> {
  await encoreDb.originalTakeBlobs.where('songId').equals(songId).delete();
}

/**
 * Reclaim take blobs whose original no longer exists.
 *
 * A local delete deliberately leaves blobs behind so undo can restore a playable song; this sweep
 * collects them once the delete has settled. Runs on sync, so a blob survives at least until the
 * next pull — long enough for the session's undo stack to matter.
 *
 * @returns the number of blob rows removed.
 */
export async function pruneOrphanedOriginalTakeBlobs(): Promise<number> {
  const [songIds, blobs] = await Promise.all([
    encoreDb.originals.toCollection().primaryKeys(),
    encoreDb.originalTakeBlobs.toCollection().primaryKeys(),
  ]);
  if (blobs.length === 0) return 0;
  const live = new Set(songIds);
  // Blob primary keys are `${songId}:${takeId}` and a take id never contains ':'.
  const orphaned = blobs.filter((key) => !live.has(key.slice(0, key.lastIndexOf(':'))));
  if (orphaned.length === 0) return 0;
  await encoreDb.originalTakeBlobs.bulkDelete(orphaned);
  return orphaned.length;
}
