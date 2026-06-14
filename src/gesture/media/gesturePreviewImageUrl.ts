import { driveResolveThumbnailLink } from '../../shared/drive/driveFetch';
import { fetchDriveImageObjectUrl, probeImageUrlLoads } from './gestureDriveImageLoad';
import {
  buildDriveThumbnailFallbackUrl,
  scaleDriveThumbnailUrl,
} from './gestureReferenceImageUrl';

/** Small thumbs for collection cards — keep bytes low for fast paint. */
export const GESTURE_PREVIEW_THUMB_WIDTH = 320;

const HIT_TTL_MS = 45 * 60 * 1000;
const MISS_TTL_MS = 2 * 60 * 1000;

type CacheEntry = { url: string; expiresAt: number };

const previewCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();
let cacheVersion = 0;
const listeners = new Set<() => void>();

function notifyPreviewCache(): void {
  cacheVersion += 1;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeGesturePreviewCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGesturePreviewCacheVersion(): number {
  return cacheVersion;
}

function previewCacheKey(fileId: string): string {
  return `${fileId}@${GESTURE_PREVIEW_THUMB_WIDTH}`;
}

function readPreviewCache(fileId: string): string | null {
  const key = previewCacheKey(fileId);
  const row = previewCache.get(key);
  if (!row) return null;
  if (Date.now() > row.expiresAt) {
    revokePreviewBlob(row.url);
    previewCache.delete(key);
    return null;
  }
  return row.url;
}

function revokePreviewBlob(url: string): void {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url);
}

function writePreviewCache(fileId: string, url: string, hit: boolean): void {
  const key = previewCacheKey(fileId);
  const prev = previewCache.get(key);
  if (prev && prev.url !== url) revokePreviewBlob(prev.url);

  previewCache.set(key, {
    url,
    expiresAt: Date.now() + (hit ? HIT_TTL_MS : MISS_TTL_MS),
  });
  notifyPreviewCache();
}

/** Synchronous read — use for instant re-render when another card already warmed the cache. */
export function peekGesturePreviewUrl(fileId: string): string | null {
  return readPreviewCache(fileId);
}

export async function resolveGesturePreviewImageUrl(
  accessToken: string | null,
  fileId: string,
): Promise<string> {
  const cached = readPreviewCache(fileId);
  if (cached) return cached;

  const pending = inflight.get(fileId);
  if (pending) return pending;

  const promise = (async () => {
    const width = GESTURE_PREVIEW_THUMB_WIDTH;
    const fallback = buildDriveThumbnailFallbackUrl(fileId, width);
    if (!accessToken) {
      writePreviewCache(fileId, fallback, false);
      return fallback;
    }

    try {
      const link = await driveResolveThumbnailLink(accessToken, fileId);
      if (link) {
        const scaled = scaleDriveThumbnailUrl(link, width);
        if (await probeImageUrlLoads(scaled)) {
          writePreviewCache(fileId, scaled, true);
          return scaled;
        }
      }
    } catch {
      /* fall through */
    }

    try {
      const blobUrl = await fetchDriveImageObjectUrl(accessToken, fileId);
      writePreviewCache(fileId, blobUrl, true);
      return blobUrl;
    } catch {
      /* fall through */
    }

    writePreviewCache(fileId, fallback, false);
    return fallback;
  })().finally(() => {
    inflight.delete(fileId);
  });

  inflight.set(fileId, promise);
  return promise;
}

export async function warmGesturePreviewUrls(
  accessToken: string | null,
  fileIds: string[],
): Promise<void> {
  const unique = [...new Set(fileIds.filter(Boolean))];
  const missing = unique.filter((id) => !readPreviewCache(id));
  if (missing.length === 0) return;
  await Promise.all(missing.map((id) => resolveGesturePreviewImageUrl(accessToken, id)));
}
