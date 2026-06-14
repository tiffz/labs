import type { SessionQueueItem } from '../types';
import {
  getCachedGestureImageUrl,
  resolveGestureSessionImageSrc,
  retainGesturePrefetchKeys,
} from './gestureImagePrefetchCache';
import { resolveGestureReferenceImageUrl } from './gestureThumbnailLinkCache';

export type PrefetchGestureSessionImagesResult =
  | { ok: true }
  | { ok: false; error: string };

const DEFAULT_AHEAD = 3;

async function prefetchOne(
  accessToken: string | null,
  item: SessionQueueItem,
): Promise<void> {
  if (getCachedGestureImageUrl(item.driveFileId)) return;
  const remoteUrl = await resolveGestureReferenceImageUrl(accessToken, item.driveFileId);
  await resolveGestureSessionImageSrc(accessToken, item.driveFileId, remoteUrl, item.name);
}

/** Load the first photo (required) and warm the next few queue items before zen mode. */
export async function prefetchGestureSessionImages(
  accessToken: string | null,
  queue: SessionQueueItem[],
  opts?: { requiredCount?: number; aheadCount?: number },
): Promise<PrefetchGestureSessionImagesResult> {
  const requiredCount = Math.max(1, opts?.requiredCount ?? 1);
  const aheadCount = Math.max(requiredCount, opts?.aheadCount ?? DEFAULT_AHEAD);
  const slice = queue.slice(0, Math.min(queue.length, aheadCount));
  if (slice.length === 0) {
    return { ok: false, error: 'No photos in this session.' };
  }

  retainGesturePrefetchKeys(slice.map((item) => item.driveFileId));

  for (let i = 0; i < requiredCount; i += 1) {
    const item = slice[i];
    if (!item) break;
    try {
      await prefetchOne(accessToken, item);
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Could not load reference image.',
      };
    }
  }

  const warmRest = slice.slice(requiredCount);
  await Promise.all(
    warmRest.map((item) =>
      prefetchOne(accessToken, item).catch(() => undefined),
    ),
  );

  return { ok: true };
}
