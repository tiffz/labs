import { fetchAndCacheGestureMediaBlob, peekCachedGestureMediaUrl } from './gestureMediaFetch';
import { probeImageUrlLoads } from './gestureDriveImageLoad';
import { resolveReferenceImageDisplayWidth } from './gestureReferenceImageUrl';

const MAX_ENTRIES = 8;
const MAX_BYTES = 48 * 1024 * 1024;

type PrefetchEntry = {
  key: string;
  objectUrl: string;
  byteSize: number;
  lastUsedAt: number;
};

const entries = new Map<string, PrefetchEntry>();
let totalBytes = 0;
/** Keys retained for the current session window — never LRU-evicted while retained. */
let retainedKeys = new Set<string>();

function touch(entry: PrefetchEntry): void {
  entry.lastUsedAt = Date.now();
}

function isRevocableObjectUrl(url: string): boolean {
  return url.startsWith('blob:');
}

function evictOutside(keepKeys: Set<string>): void {
  for (const [key, entry] of entries) {
    if (keepKeys.has(key)) continue;
    if (isRevocableObjectUrl(entry.objectUrl)) {
      URL.revokeObjectURL(entry.objectUrl);
    }
    totalBytes -= entry.byteSize;
    entries.delete(key);
  }
}

function evictLru(): void {
  while (entries.size > MAX_ENTRIES || totalBytes > MAX_BYTES) {
    let oldestKey: string | null = null;
    let oldestAt = Infinity;
    for (const [key, entry] of entries) {
      if (retainedKeys.has(key)) continue;
      if (entry.lastUsedAt < oldestAt) {
        oldestAt = entry.lastUsedAt;
        oldestKey = key;
      }
    }
    if (!oldestKey) break;
    const victim = entries.get(oldestKey);
    if (!victim) break;
    if (isRevocableObjectUrl(victim.objectUrl)) {
      URL.revokeObjectURL(victim.objectUrl);
    }
    totalBytes -= victim.byteSize;
    entries.delete(oldestKey);
  }
}

function rememberEntry(key: string, objectUrl: string, byteSize = 0): string {
  entries.set(key, { key, objectUrl, byteSize, lastUsedAt: Date.now() });
  totalBytes += byteSize;
  evictLru();
  return objectUrl;
}

/**
 * Cache a display URL for a queue item. Thumbnail links load via `<img>` (no CORS fetch).
 * Falls back to OAuth `alt=media` blob URLs when thumbnails fail.
 */
export async function resolveGestureSessionImageSrc(
  accessToken: string | null,
  fileId: string,
  remoteUrl: string,
  fileName?: string,
): Promise<string> {
  const existing = entries.get(fileId);
  if (existing) {
    touch(existing);
    return existing.objectUrl;
  }

  const idbCached = peekCachedGestureMediaUrl(fileId, 'session');
  if (idbCached) {
    return rememberEntry(fileId, idbCached);
  }

  const width = resolveReferenceImageDisplayWidth();
  const idbUrl = await fetchAndCacheGestureMediaBlob(accessToken, fileId, 'session', width, fileName);
  if (idbUrl) {
    return rememberEntry(fileId, idbUrl);
  }

  if (await probeImageUrlLoads(remoteUrl)) {
    return rememberEntry(fileId, remoteUrl, 0);
  }

  if (!accessToken) {
    throw new Error('Could not load reference image. Sign in to Google and try again.');
  }

  throw new Error('Could not load reference image.');
}

/** @deprecated Prefer {@link resolveGestureSessionImageSrc} — Drive thumbnails reject CORS fetch. */
export async function prefetchGestureImageUrl(url: string, key: string): Promise<string> {
  const existing = entries.get(key);
  if (existing) {
    touch(existing);
    return existing.objectUrl;
  }

  if (await probeImageUrlLoads(url)) {
    return rememberEntry(key, url, 0);
  }

  throw new Error('Could not load reference image.');
}

export function getCachedGestureImageUrl(key: string): string | null {
  const entry = entries.get(key);
  if (entry) {
    touch(entry);
    return entry.objectUrl;
  }
  return peekCachedGestureMediaUrl(key, 'session');
}

export function retainGesturePrefetchKeys(keepKeys: string[]): void {
  retainedKeys = new Set(keepKeys);
  evictOutside(retainedKeys);
}

export function clearGestureImagePrefetchCache(): void {
  for (const entry of entries.values()) {
    if (isRevocableObjectUrl(entry.objectUrl)) {
      URL.revokeObjectURL(entry.objectUrl);
    }
  }
  entries.clear();
  totalBytes = 0;
  retainedKeys = new Set();
}

export async function preloadGestureImageViaElement(url: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Image preload failed'));
    img.src = url;
  });
}
