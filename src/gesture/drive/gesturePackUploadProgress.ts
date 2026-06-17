import { gestureDb } from '../db/gestureDb';
import type { GesturePack } from '../types';
import { GestureUploadCancelledError } from './gestureUploadCancellation';

export type GesturePackUploadProgressPatch = Pick<
  GesturePack,
  'uploadStatus' | 'expectedFileCount' | 'uploadedFileCount' | 'uploadSourceFolderName' | 'lastIndexedAt'
>;

/** Apply upload progress without clobbering user-edited name, tags, or source URL. */
export async function putGesturePackUploadProgress(
  packId: string,
  patch: Partial<GesturePackUploadProgressPatch>,
): Promise<GesturePack> {
  const latest = await gestureDb.packs.get(packId);
  if (!latest) {
    throw new GestureUploadCancelledError(packId);
  }

  const merged: GesturePack = { ...latest };

  if (patch.uploadStatus !== undefined) merged.uploadStatus = patch.uploadStatus;
  if (patch.expectedFileCount !== undefined) merged.expectedFileCount = patch.expectedFileCount;
  if (patch.uploadedFileCount !== undefined) merged.uploadedFileCount = patch.uploadedFileCount;
  if (patch.uploadSourceFolderName !== undefined) {
    merged.uploadSourceFolderName = patch.uploadSourceFolderName;
  }
  if (patch.lastIndexedAt !== undefined) merged.lastIndexedAt = patch.lastIndexedAt;

  await gestureDb.packs.put(merged);
  return merged;
}

/** Read latest pack row before clearing upload flags (preserve metadata edits). */
export async function putGesturePackUploadCleared(
  packId: string,
  clearFields: (pack: GesturePack) => GesturePack,
): Promise<GesturePack> {
  const latest = await gestureDb.packs.get(packId);
  if (!latest) {
    throw new GestureUploadCancelledError(packId);
  }
  const cleared = clearFields(latest);
  await gestureDb.packs.put(cleared);
  return cleared;
}
