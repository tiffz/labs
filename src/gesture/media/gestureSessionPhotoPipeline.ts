import {
  dropGesturePrefetchEntry,
  getCachedGestureImageUrl,
  preloadGestureImageViaElement,
  resolveGestureSessionImageSrc,
} from './gestureImagePrefetchCache';
import { subscribeGestureMediaCacheEvictions } from './gestureMediaCache';
import { resolveGestureReferenceImageUrl } from './gestureThumbnailLinkCache';
import type { SessionQueueItem } from '../types';

const displayReady = new Set<string>();
const inflight = new Map<string, Promise<void>>();

if (typeof window !== 'undefined') {
  subscribeGestureMediaCacheEvictions((driveFileId, kind) => {
    if (kind !== 'session') return;
    dropGesturePrefetchEntry(driveFileId);
    displayReady.delete(driveFileId);
    inflight.delete(driveFileId);
  });
}

export function isGestureSessionPhotoDisplayReady(driveFileId: string): boolean {
  return displayReady.has(driveFileId);
}

export function markGestureSessionPhotoDisplayReady(driveFileId: string): void {
  displayReady.add(driveFileId);
}

export function unmarkGestureSessionPhotoDisplayReady(driveFileId: string): void {
  displayReady.delete(driveFileId);
  inflight.delete(driveFileId);
}

export function clearGestureSessionPhotoDisplayReady(): void {
  displayReady.clear();
  inflight.clear();
}

/** Fetch (if needed) and decode one session photo so zen can paint immediately. */
export async function prefetchGestureSessionPhotoUntilReady(
  accessToken: string | null,
  item: SessionQueueItem,
): Promise<void> {
  const { driveFileId } = item;
  if (displayReady.has(driveFileId)) {
    const cached = getCachedGestureImageUrl(driveFileId);
    if (cached) {
      try {
        await preloadGestureImageViaElement(cached);
        return;
      } catch {
        unmarkGestureSessionPhotoDisplayReady(driveFileId);
      }
    } else {
      unmarkGestureSessionPhotoDisplayReady(driveFileId);
    }
  }

  const pending = inflight.get(driveFileId);
  if (pending) return pending;

  const promise = (async () => {
    let displayUrl = getCachedGestureImageUrl(driveFileId);
    if (!displayUrl) {
      const remoteUrl = await resolveGestureReferenceImageUrl(accessToken, driveFileId);
      displayUrl = await resolveGestureSessionImageSrc(
        accessToken,
        driveFileId,
        remoteUrl,
        item.name,
      );
    }
    await preloadGestureImageViaElement(displayUrl);
    displayReady.add(driveFileId);
  })().finally(() => {
    inflight.delete(driveFileId);
  });

  inflight.set(driveFileId, promise);
  return promise;
}

/** Prefetch a single queue slot; no-op when out of range or already ready. */
export async function prefetchGestureSessionQueuePhoto(
  accessToken: string | null,
  queue: SessionQueueItem[],
  index: number,
): Promise<void> {
  const item = queue[index];
  if (!item) return;
  await prefetchGestureSessionPhotoUntilReady(accessToken, item);
}
