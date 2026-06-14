import type { SessionQueueItem } from '../types';
import { retainGesturePrefetchKeys } from './gestureImagePrefetchCache';
import {
  isGestureSessionPhotoDisplayReady,
  prefetchGestureSessionPhotoUntilReady,
  prefetchGestureSessionQueuePhoto,
} from './gestureSessionPhotoPipeline';

export type PrefetchGestureSessionImagesResult =
  | { ok: true }
  | { ok: false; error: string };

/** Load and decode session photos up to aheadCount (defaults to one required photo). */
export async function prefetchGestureSessionImages(
  accessToken: string | null,
  queue: SessionQueueItem[],
  opts?: { requiredCount?: number; aheadCount?: number },
): Promise<PrefetchGestureSessionImagesResult> {
  const requiredCount = Math.max(0, opts?.requiredCount ?? 1);
  const aheadCount = Math.max(requiredCount, opts?.aheadCount ?? 1);
  const slice = queue.slice(0, Math.min(queue.length, aheadCount));
  if (slice.length === 0) {
    return { ok: false, error: 'No photos in this session.' };
  }

  retainGesturePrefetchKeys(slice.map((item) => item.driveFileId));

  try {
    for (let i = 0; i < requiredCount; i += 1) {
      const item = slice[i];
      if (!item) break;
      if (!isGestureSessionPhotoDisplayReady(item.driveFileId)) {
        await prefetchGestureSessionPhotoUntilReady(accessToken, item);
      }
    }

    if (requiredCount === 0) {
      await Promise.all(
        slice.map((item) =>
          prefetchGestureSessionQueuePhoto(accessToken, queue, queue.indexOf(item)).catch(
            () => undefined,
          ),
        ),
      );
    } else {
      const warmRest = slice.slice(requiredCount);
      await Promise.all(
        warmRest.map((item) =>
          prefetchGestureSessionPhotoUntilReady(accessToken, item).catch(() => undefined),
        ),
      );
    }

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not load reference image.',
    };
  }
}
