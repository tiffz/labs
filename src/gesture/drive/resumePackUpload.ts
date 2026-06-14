import { gestureDb } from '../db/gestureDb';
import type { GesturePack } from '../types';
import { inferLocalFolderName } from './gestureLocalFolderUpload';
import {
  clearedUploadFields,
  clearUploadManifestForPack,
  uploadFilesToExistingPack,
} from './gesturePackUpload';
import {
  countManifestProgress,
  selectFilesToUpload,
} from './gestureUploadManifest';
import { isIncompleteUploadPack } from './gestureUploadActivity';

export type ResumePackUploadResult = {
  pack: GesturePack;
  newlyUploaded: number;
  skipped: number;
  skippedDuplicates: number;
  total: number;
};

export async function resumePackUpload(
  accessToken: string,
  packId: string,
  picked: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<ResumePackUploadResult> {
  const pack = await gestureDb.packs.get(packId);
  if (!pack) throw new Error('Collection not found.');
  if (!isIncompleteUploadPack(pack)) {
    throw new Error('This collection is not waiting for an upload.');
  }

  const manifest = await gestureDb.uploadManifestFiles.where('packId').equals(packId).toArray();
  const packFiles = await gestureDb.packFiles.where('packId').equals(packId).toArray();
  const uploadedNames = new Set(packFiles.map((f) => f.name));

  const { toUpload, skipped } = selectFilesToUpload(manifest, picked, uploadedNames);
  if (toUpload.length === 0) {
    const { uploaded, total } = countManifestProgress(manifest);
    const totalCount = total || pack.expectedFileCount || uploadedNames.size;
    if (uploaded >= totalCount && totalCount > 0) {
      const finalized = clearedUploadFields({
        ...pack,
        lastIndexedAt: new Date().toISOString(),
      });
      await gestureDb.packs.put(finalized);
      await clearUploadManifestForPack(packId);
      return { pack: finalized, newlyUploaded: 0, skipped, skippedDuplicates: 0, total: totalCount };
    }
    throw new Error(
      'No new photos matched this upload. Choose the same folder you started with, or use a partial collection.',
    );
  }

  const sourceFolder = inferLocalFolderName(picked);
  let packForUpload = pack;
  if (sourceFolder && !pack.uploadSourceFolderName) {
    packForUpload = { ...pack, uploadSourceFolderName: sourceFolder };
    await gestureDb.packs.put(packForUpload);
  }

  const total =
    manifest.length > 0
      ? manifest.length
      : Math.max(pack.expectedFileCount ?? 0, packFiles.length + toUpload.length);

  const result = await uploadFilesToExistingPack(
    accessToken,
    { ...packForUpload, expectedFileCount: total },
    toUpload,
    onProgress,
  );
  const progress = countManifestProgress(
    await gestureDb.uploadManifestFiles.where('packId').equals(packId).toArray(),
  );

  return {
    pack: result.pack,
    newlyUploaded: result.uploadedCount,
    skipped,
    skippedDuplicates: result.skippedDuplicates,
    total: progress.total || total,
  };
}
