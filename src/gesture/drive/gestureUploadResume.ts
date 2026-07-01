import { gestureDb } from '../db/gestureDb';
import type { GesturePack } from '../types';
import { readDirectoryHandleFiles } from './gestureFolderPicker';
import {
  readFilesFromPersistedDirectoryHandle,
  hasPersistedUploadDirectoryHandle,
} from './gestureUploadDirectoryHandle';
import { hasStagedUploadFiles, readStagedUploadFiles } from './gestureUploadStaging';
import {
  collectLocalFolderUploadImages,
  isLocalFolderUpload,
  resolveUploadCollectionName,
} from './gestureLocalFolderUpload';
import { filterGestureUploadImageFiles } from './gesturePackMetadata';
import { isIncompleteUploadPack } from './gestureUploadActivity';

type NewCollectionJobLike = {
  files: File[];
  suggestedFolderName?: string;
  packId?: string;
  batchJobId?: string;
  directoryHandle?: FileSystemDirectoryHandle;
};

function imageFilesForUploadJob(job: NewCollectionJobLike, files: File[]): File[] {
  const fromFolder = Boolean(job.suggestedFolderName) || isLocalFolderUpload(files);
  return fromFolder ? collectLocalFolderUploadImages(files) : filterGestureUploadImageFiles(files);
}

/** Prefer persisted directory handles so queued jobs survive tab backgrounding and refresh. */
export async function resolveUploadJobFiles(job: NewCollectionJobLike): Promise<File[]> {
  const handleKeys = [job.packId, job.batchJobId].filter(Boolean) as string[];
  for (const key of handleKeys) {
    const fromPersisted = await readFilesFromPersistedDirectoryHandle(key);
    if (fromPersisted?.length) {
      const images = imageFilesForUploadJob(job, fromPersisted);
      if (images.length > 0) return images;
    }
  }

  if (job.directoryHandle) {
    const fromHandle = await readDirectoryHandleFiles(job.directoryHandle, job.directoryHandle.name);
    if (fromHandle.length > 0) {
      const images = imageFilesForUploadJob(job, fromHandle);
      if (images.length > 0) return images;
    }
  }

  return job.files;
}

/** Match an in-progress collection when resuming a queued folder job after reconnect. */
export async function findResumablePackForUploadJob(
  job: NewCollectionJobLike,
): Promise<GesturePack | null> {
  if (job.packId) {
    const pack = await gestureDb.packs.get(job.packId);
    if (pack && isIncompleteUploadPack(pack)) return pack;
  }
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
