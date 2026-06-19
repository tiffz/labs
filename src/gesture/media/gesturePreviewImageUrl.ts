import {
  GESTURE_PREVIEW_THUMB_WIDTH,
  resolveGesturePreviewTierUrl,
} from './gestureMediaPolicy';
import { buildDriveThumbnailFallbackUrl } from './gestureReferenceImageUrl';
import { fetchDriveImageBlob } from './gestureDriveImageLoad';
import { getCachedGestureMediaObjectUrl, putCachedGestureMediaBlob } from './gestureMediaCache';
import { resizeGesturePreviewBlob } from './gesturePreviewBlobResize';
import {
  peekPinnedGesturePreviewBlobUrl,
  pinGesturePreviewBlobUrl,
  releasePinnedGesturePreviewBlobUrls,
  retainPinnedGesturePreviewBlobUrls,
} from './gesturePreviewDisplayPins';
import { gesturePreviewResolveTier } from './gesturePreviewResolvePriority';

const HIT_TTL_MS = 45 * 60 * 1000;
const MISS_TTL_MS = 2 * 60 * 1000;

type CacheEntry = { url: string; expiresAt: number };

const previewCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();
const cacheVersions = new Map<string, number>();
const idListeners = new Map<string, Set<() => void>>();

const MAX_CONCURRENT_PREVIEW_RESOLVES = 3;
let activePreviewResolves = 0;

type PreviewResolveWaiter = {
  tier: number;
  resume: () => void;
};

const previewResolveWaiters: PreviewResolveWaiter[] = [];

function acquirePreviewResolveSlot(tier: number): Promise<void> {
  if (activePreviewResolves < MAX_CONCURRENT_PREVIEW_RESOLVES) {
    activePreviewResolves += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    previewResolveWaiters.push({
      tier,
      resume: () => {
        activePreviewResolves += 1;
        resolve();
      },
    });
    previewResolveWaiters.sort((a, b) => a.tier - b.tier);
  });
}

function releasePreviewResolveSlot(): void {
  activePreviewResolves -= 1;
  previewResolveWaiters.sort((a, b) => a.tier - b.tier);
  const next = previewResolveWaiters.shift();
  if (next) next.resume();
}

const pendingPreviewNotifyIds = new Set<string>();
let previewNotifyRaf = 0;

function flushPreviewCacheNotifications(): void {
  previewNotifyRaf = 0;
  if (pendingPreviewNotifyIds.size === 0) return;
  const ids = [...pendingPreviewNotifyIds];
  pendingPreviewNotifyIds.clear();
  for (const id of ids) {
    cacheVersions.set(id, (cacheVersions.get(id) ?? 0) + 1);
    idListeners.get(id)?.forEach((listener) => listener());
  }
}

function notifyPreviewCache(fileId: string): void {
  pendingPreviewNotifyIds.add(fileId);
  if (previewNotifyRaf !== 0) return;
  previewNotifyRaf = requestAnimationFrame(flushPreviewCacheNotifications);
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

export function getGesturePreviewCacheSnapshot(
  fileIds: string[],
  width = GESTURE_PREVIEW_THUMB_WIDTH,
): string {
  return fileIds.map((id) => `${cacheVersions.get(id) ?? 0}:${peekGesturePreviewUrl(id, width) ? 1 : 0}`).join(',');
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

export { GESTURE_COMPACT_PREVIEW_THUMB_WIDTH, GESTURE_PREVIEW_THUMB_WIDTH } from './gestureMediaPolicy';

function previewCacheKey(fileId: string, width = GESTURE_PREVIEW_THUMB_WIDTH): string {
  return `${fileId}@${width}`;
}

function readPreviewCache(fileId: string, width = GESTURE_PREVIEW_THUMB_WIDTH): string | null {
  const key = previewCacheKey(fileId, width);
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

function writePreviewCache(
  fileId: string,
  url: string,
  hit: boolean,
  width = GESTURE_PREVIEW_THUMB_WIDTH,
): void {
  if (url.startsWith('blob:')) {
    notifyPreviewCache(fileId);
    return;
  }

  const key = previewCacheKey(fileId, width);
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
export function peekGesturePreviewUrl(
  fileId: string,
  width = GESTURE_PREVIEW_THUMB_WIDTH,
): string | null {
  const https = readPreviewCache(fileId, width);
  if (https) return https;
  if (width < GESTURE_PREVIEW_THUMB_WIDTH) {
    const larger = readPreviewCache(fileId, GESTURE_PREVIEW_THUMB_WIDTH);
    if (larger) return larger;
  }
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
      const { blob, mimeType } = await fetchDriveImageBlob(accessToken, fileId);
      const previewBlob = await resizeGesturePreviewBlob(blob, width, mimeType);
      const cached = await putCachedGestureMediaBlob(fileId, 'preview', previewBlob, width, mimeType);
      if (cached.startsWith('blob:')) {
        const url = pinGesturePreviewBlobUrl(fileId, previewBlob);
        notifyPreviewCache(fileId);
        return url;
      }
      notifyPreviewCache(fileId);
      return cached;
    } catch {
      /* fall through */
    }
  }

  return buildDriveThumbnailFallbackUrl(fileId, width);
}

function clearHttpsPreviewCache(fileId: string, width: number): void {
  for (const w of [width, GESTURE_PREVIEW_THUMB_WIDTH]) {
    const key = previewCacheKey(fileId, w);
    const row = previewCache.get(key);
    if (row) {
      revokePreviewBlob(row.url);
      previewCache.delete(key);
    }
  }
  notifyPreviewCache(fileId);
}

/** After a cached https thumb fails in `<img>`, fetch a pinned display blob instead. */
export async function retryGesturePreviewAfterImageError(
  accessToken: string | null,
  fileId: string,
  width = GESTURE_PREVIEW_THUMB_WIDTH,
): Promise<string> {
  clearHttpsPreviewCache(fileId, width);
  return ensurePinnedPreviewBlobUrl(accessToken, fileId, width);
}

export async function resolveGesturePreviewImageUrl(
  accessToken: string | null,
  fileId: string,
  width = GESTURE_PREVIEW_THUMB_WIDTH,
): Promise<string> {
  const cached = peekGesturePreviewUrl(fileId, width);
  if (cached) return cached;

  const inflightKey = previewCacheKey(fileId, width);
  const pending = inflight.get(inflightKey);
  if (pending) return pending;

  const promise = (async () => {
    await acquirePreviewResolveSlot(gesturePreviewResolveTier(fileId));
    try {
      const resolved = await resolveGesturePreviewTierUrl(accessToken, fileId, width);
      if (!resolved.startsWith('blob:')) {
        writePreviewCache(fileId, resolved, true, width);
        return resolved;
      }
      return await ensurePinnedPreviewBlobUrl(accessToken, fileId, width);
    } finally {
      releasePreviewResolveSlot();
    }
  })().finally(() => {
    inflight.delete(inflightKey);
  });

  inflight.set(inflightKey, promise);
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
