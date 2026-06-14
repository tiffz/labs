import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import type { GesturePack } from '../types';
import {
  collectLocalFolderUploadImages,
  isLocalFolderUpload,
} from './gestureLocalFolderUpload';
import { filterGestureUploadImageFiles } from './gesturePackMetadata';
import { appendUploadManifest, uploadFilesToExistingPack } from './gesturePackUpload';

export type AddPhotosToPackResult = {
  pack: GesturePack;
  uploadedCount: number;
  skippedDuplicates: number;
  totalCandidates: number;
};

export async function addPhotosToExistingPack(
  accessToken: string,
  packId: string,
  files: File[],
  onProgress?: (done: number, total: number) => void,
  onDuplicateCheck?: (hashed: number, total: number) => void,
): Promise<AddPhotosToPackResult> {
  const pack = await gestureDb.packs.get(packId);
  if (!pack) throw new Error('Collection not found.');
  if (pack.uploadStatus === 'uploading') {
    throw new Error('This collection is still uploading. Wait for it to finish or use Continue upload.');
  }

  const fromFolder = isLocalFolderUpload(files);
  const images = fromFolder ? collectLocalFolderUploadImages(files) : filterGestureUploadImageFiles(files);
  if (images.length === 0) {
    throw new Error('Add at least one image file (JPEG, PNG, WebP, GIF, or similar).');
  }

  await appendUploadManifest(packId, images);
  notifyGestureLocalChange();

  const packForUpload: GesturePack = {
    ...pack,
    expectedFileCount: (pack.expectedFileCount ?? 0) + images.length,
  };
  await gestureDb.packs.put(packForUpload);

  const result = await uploadFilesToExistingPack(
    accessToken,
    packForUpload,
    images,
    onProgress,
    onDuplicateCheck,
  );

  return {
    pack: result.pack,
    uploadedCount: result.uploadedCount,
    skippedDuplicates: result.skippedDuplicates,
    totalCandidates: images.length,
  };
}
