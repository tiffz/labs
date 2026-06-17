import { gestureDb } from '../db/gestureDb';
import type { GesturePack } from '../types';
import { readFilesFromPersistedDirectoryHandle, hasPersistedUploadDirectoryHandle } from './gestureUploadDirectoryHandle';
import { hasStagedUploadFiles, readStagedUploadFiles } from './gestureUploadStaging';
import { resolveUploadCollectionName } from './gestureLocalFolderUpload';
import { isIncompleteUploadPack } from './gestureUploadActivity';

type NewCollectionJobLike = {
  files: File[];
  suggestedFolderName?: string;
};

/** Match an in-progress collection when resuming a queued folder job after reconnect. */
export async function findResumablePackForUploadJob(
  job: NewCollectionJobLike,
): Promise<GesturePack | null> {
  const sourceName =
    job.suggestedFolderName ?? resolveUploadCollectionName(job.files, job.suggestedFolderName);
  const packs = await gestureDb.packs.toArray();
  const candidates = packs.filter((pack) => isIncompleteUploadPack(pack));
  if (candidates.length === 0) return null;

  if (!sourceName) return null;

  const bySource = candidates.find((pack) => pack.uploadSourceFolderName === sourceName);
  if (bySource) return bySource;

  const byName = candidates.find((pack) => pack.name === sourceName);
  if (byName) return byName;

  return null;
}

export async function canResumeUploadWithoutRepick(packId: string): Promise<boolean> {
  if (await hasPersistedUploadDirectoryHandle(packId)) return true;
  if (await hasStagedUploadFiles(packId)) return true;
  return false;
}

/** Directory handle first, then staged blobs for pending manifest rows. */
export async function loadFilesForUploadResume(packId: string): Promise<File[] | null> {
  const fromHandle = await readFilesFromPersistedDirectoryHandle(packId);
  if (fromHandle && fromHandle.length > 0) return fromHandle;

  const fromStaging = await readStagedUploadFiles(packId);
  if (fromStaging.length > 0) return fromStaging;

  return null;
}
