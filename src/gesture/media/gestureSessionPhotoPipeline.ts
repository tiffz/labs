import {
  getCachedGestureImageUrl,
  preloadGestureImageViaElement,
  resolveGestureSessionImageSrc,
} from './gestureImagePrefetchCache';
import { resolveGestureReferenceImageUrl } from './gestureThumbnailLinkCache';
import type { SessionQueueItem } from '../types';

const displayReady = new Set<string>();
const inflight = new Map<string, Promise<void>>();

export function isGestureSessionPhotoDisplayReady(driveFileId: string): boolean {
  return displayReady.has(driveFileId);
}

export function markGestureSessionPhotoDisplayReady(driveFileId: string): void {
  displayReady.add(driveFileId);
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
  if (displayReady.has(driveFileId)) return;

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
