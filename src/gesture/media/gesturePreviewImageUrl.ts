import {
  GESTURE_PREVIEW_THUMB_WIDTH,
  resolveGesturePreviewTierUrl,
} from './gestureMediaPolicy';
import { buildDriveThumbnailFallbackUrl } from './gestureReferenceImageUrl';
import { fetchDriveImageBlob } from './gestureDriveImageLoad';
import { getCachedGestureMediaObjectUrl } from './gestureMediaCache';
import {
  peekPinnedGesturePreviewBlobUrl,
  pinGesturePreviewBlobUrl,
  releasePinnedGesturePreviewBlobUrls,
  retainPinnedGesturePreviewBlobUrls,
} from './gesturePreviewDisplayPins';

const HIT_TTL_MS = 45 * 60 * 1000;
const MISS_TTL_MS = 2 * 60 * 1000;

type CacheEntry = { url: string; expiresAt: number };

const previewCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();
const cacheVersions = new Map<string, number>();
const idListeners = new Map<string, Set<() => void>>();

const MAX_CONCURRENT_PREVIEW_RESOLVES = 8;
let activePreviewResolves = 0;
const previewResolveWaiters: Array<() => void> = [];

function acquirePreviewResolveSlot(): Promise<void> {
  if (activePreviewResolves < MAX_CONCURRENT_PREVIEW_RESOLVES) {
    activePreviewResolves += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    previewResolveWaiters.push(() => {
      activePreviewResolves += 1;
      resolve();
    });
  });
}

function releasePreviewResolveSlot(): void {
  activePreviewResolves -= 1;
  const next = previewResolveWaiters.shift();
  if (next) next();
}

function notifyPreviewCache(fileId: string): void {
  cacheVersions.set(fileId, (cacheVersions.get(fileId) ?? 0) + 1);
  idListeners.get(fileId)?.forEach((listener) => listener());
}

export function subscribeGesturePreviewCacheForIds(
  fileIds: string[],
  listener: () => void,
): () => void {
  const subscribed = new Set<string>();
  for (const id of fileIds) {
    if (!id || subscribed.has(id)) continue;
    subscribed.add(id);
    let set = idListeners.get(id);
    if (!set) {
      set = new Set();
      idListeners.set(id, set);
    }
    set.add(listener);
  }
  return () => {
    for (const id of subscribed) {
      idListeners.get(id)?.delete(listener);
    }
  };
}

export function getGesturePreviewCacheSnapshot(fileIds: string[]): string {
  return fileIds.map((id) => cacheVersions.get(id) ?? 0).join(',');
}

/** @deprecated Prefer {@link subscribeGesturePreviewCacheForIds} scoped to visible ids. */
export function subscribeGesturePreviewCache(listener: () => void): () => void {
  const proxy = () => listener();
  const allIds = [...previewCache.keys()].map((key) => key.split('@')[0] ?? key);
  return subscribeGesturePreviewCacheForIds(allIds, proxy);
}

/** @deprecated Prefer {@link getGesturePreviewCacheSnapshot}. */
export function getGesturePreviewCacheVersion(): number {
  let total = 0;
  for (const version of cacheVersions.values()) total += version;
  return total;
}

export { GESTURE_PREVIEW_THUMB_WIDTH } from './gestureMediaPolicy';

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
  // Blob URLs are owned by gestureMediaCache — never keep a stale copy here.
  if (row.url.startsWith('blob:')) {
    previewCache.delete(key);
    return null;
  }
  return row.url;
}

function revokePreviewBlob(url: string): void {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url);
}

function writePreviewCache(fileId: string, url: string, hit: boolean): void {
  if (url.startsWith('blob:')) {
    notifyPreviewCache(fileId);
    return;
  }

  const key = previewCacheKey(fileId);
  const prev = previewCache.get(key);
  if (prev && prev.url !== url) revokePreviewBlob(prev.url);

  previewCache.set(key, {
    url,
    expiresAt: Date.now() + (hit ? HIT_TTL_MS : MISS_TTL_MS),
  });
  notifyPreviewCache(fileId);
}

/** Load a preview blob from IndexedDB into the memory LRU (no network). */
export async function hydrateGesturePreviewFromIdb(fileId: string): Promise<string | null> {
  if (peekGesturePreviewUrl(fileId)) return peekGesturePreviewUrl(fileId);
  const url = await getCachedGestureMediaObjectUrl(fileId, 'preview');
  if (url) notifyPreviewCache(fileId);
  return url;
}

/**
 * Synchronous read of cached https preview URLs for card grids.
 * Blob object URLs are owned by gestureMediaCache and are not stable for `<img>` display.
 */
export function peekGesturePreviewUrl(fileId: string): string | null {
  const https = readPreviewCache(fileId);
  if (https) return https;
  return peekPinnedGesturePreviewBlobUrl(fileId);
}

async function ensurePinnedPreviewBlobUrl(
  accessToken: string | null,
  fileId: string,
  width: number,
): Promise<string> {
  const pinned = peekPinnedGesturePreviewBlobUrl(fileId);
  if (pinned) return pinned;

  if (accessToken) {
    try {
      const { blob } = await fetchDriveImageBlob(accessToken, fileId);
      const url = pinGesturePreviewBlobUrl(fileId, blob);
      notifyPreviewCache(fileId);
      return url;
    } catch {
      /* fall through */
    }
  }

  return buildDriveThumbnailFallbackUrl(fileId, width);
}

export async function resolveGesturePreviewImageUrl(
  accessToken: string | null,
  fileId: string,
): Promise<string> {
  const cached = peekGesturePreviewUrl(fileId);
  if (cached) return cached;

  const pending = inflight.get(fileId);
  if (pending) return pending;

  const promise = (async () => {
    await acquirePreviewResolveSlot();
    try {
      const width = GESTURE_PREVIEW_THUMB_WIDTH;
      const resolved = await resolveGesturePreviewTierUrl(accessToken, fileId, width);
      if (!resolved.startsWith('blob:')) {
        writePreviewCache(fileId, resolved, true);
        return resolved;
      }
      return await ensurePinnedPreviewBlobUrl(accessToken, fileId, width);
    } finally {
      releasePreviewResolveSlot();
    }
  })().finally(() => {
    inflight.delete(fileId);
  });

  inflight.set(fileId, promise);
  return promise;
}

/** Retain pinned preview blobs while a strip displays these ids (call release on cleanup). */
export function retainGesturePreviewUrlsForDisplay(fileIds: string[]): void {
  retainPinnedGesturePreviewBlobUrls(fileIds);
}

export function releaseGesturePreviewUrlsForDisplay(fileIds: string[]): void {
  releasePinnedGesturePreviewBlobUrls(fileIds);
}

export async function warmGesturePreviewUrls(
  accessToken: string | null,
  fileIds: string[],
): Promise<void> {
  const unique = [...new Set(fileIds.filter(Boolean))];
  const missing = unique.filter((id) => !peekGesturePreviewUrl(id));
  if (missing.length === 0) return;
  await Promise.all(missing.map((id) => resolveGesturePreviewImageUrl(accessToken, id)));
}
