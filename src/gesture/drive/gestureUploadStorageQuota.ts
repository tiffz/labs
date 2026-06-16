/** Reserve headroom for preview/session media cache (see gestureMediaCache). */
export const GESTURE_UPLOAD_STAGING_CACHE_RESERVE_BYTES = 55 * 1024 * 1024;

/** Use up to 80% of reported free quota for upload staging. */
export const GESTURE_UPLOAD_STAGING_HEADROOM_RATIO = 0.8;

export type UploadStagingPlan = 'handle' | 'staging' | 'stream';

export type StorageQuotaSnapshot = {
  usage: number;
  quota: number;
  headroomBytes: number;
};

export async function estimateUploadStagingHeadroom(): Promise<StorageQuotaSnapshot> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return { usage: 0, quota: 0, headroomBytes: 0 };
  }
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  const reserved = Math.min(usage + GESTURE_UPLOAD_STAGING_CACHE_RESERVE_BYTES, quota);
  const headroom = Math.max(0, quota - reserved);
  const headroomBytes = Math.floor(headroom * GESTURE_UPLOAD_STAGING_HEADROOM_RATIO);
  return { usage, quota, headroomBytes };
}

export function totalFileBytes(files: File[]): number {
  return files.reduce((sum, file) => sum + file.size, 0);
}

/** Whether pending upload bytes fit under estimated staging headroom (+10% metadata slack). */
export function canStageUploadBytes(pendingBytes: number, headroomBytes: number): boolean {
  if (pendingBytes <= 0) return false;
  if (headroomBytes <= 0) return false;
  return pendingBytes * 1.1 <= headroomBytes;
}

export function planUploadStagingMode(
  hasDirectoryHandle: boolean,
  pendingBytes: number,
  headroomBytes: number,
): UploadStagingPlan {
  if (hasDirectoryHandle) return 'handle';
  if (canStageUploadBytes(pendingBytes, headroomBytes)) return 'staging';
  return 'stream';
}
