import { gestureDb } from '../db/gestureDb';
import type { GestureMediaCacheKind } from '../types';

const MAX_PREVIEW_ENTRIES = 200;
const MAX_SESSION_ENTRIES = 30;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const PREVIEW_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

type MemoryEntry = {
  objectUrl: string;
  byteSize: number;
  fetchedAt: number;
  lastUsedAt: number;
};

const memory = new Map<string, MemoryEntry>();
let memoryBytes = 0;
const inflightGet = new Map<string, Promise<string | null>>();

type EvictListener = (driveFileId: string, kind: GestureMediaCacheKind) => void;
const evictListeners = new Set<EvictListener>();

export function subscribeGestureMediaCacheEvictions(listener: EvictListener): () => void {
  evictListeners.add(listener);
  return () => evictListeners.delete(listener);
}

function parseCacheKey(key: string): { kind: GestureMediaCacheKind; driveFileId: string } | null {
  const sep = key.indexOf(':');
  if (sep <= 0) return null;
  const kind = key.slice(0, sep) as GestureMediaCacheKind;
  if (kind !== 'preview' && kind !== 'session') return null;
  return { kind, driveFileId: key.slice(sep + 1) };
}

function notifyEviction(key: string): void {
  const parsed = parseCacheKey(key);
  if (!parsed) return;
  for (const listener of evictListeners) listener(parsed.driveFileId, parsed.kind);
}

function cacheKey(driveFileId: string, kind: GestureMediaCacheKind): string {
  return `${kind}:${driveFileId}`;
}

function rowId(driveFileId: string, kind: GestureMediaCacheKind): string {
  return cacheKey(driveFileId, kind);
}

function revokeObjectUrl(url: string): void {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url);
}

function touchMemory(key: string): void {
  const entry = memory.get(key);
  if (entry) entry.lastUsedAt = Date.now();
}

function evictMemoryLru(): void {
  while (memoryBytes > MAX_TOTAL_BYTES || memory.size > MAX_PREVIEW_ENTRIES + MAX_SESSION_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestAt = Infinity;
    for (const [key, entry] of memory) {
      if (entry.lastUsedAt < oldestAt) {
        oldestAt = entry.lastUsedAt;
        oldestKey = key;
      }
    }
    if (!oldestKey) break;
    const victim = memory.get(oldestKey);
    if (!victim) break;
    revokeObjectUrl(victim.objectUrl);
    memoryBytes -= victim.byteSize;
    memory.delete(oldestKey);
    notifyEviction(oldestKey);
  }
}

function putMemory(key: string, blob: Blob, fetchedAt: number): string {
  const prev = memory.get(key);
  if (prev) {
    if (prev.objectUrl.startsWith('blob:')) revokeObjectUrl(prev.objectUrl);
    memoryBytes -= prev.byteSize;
  }
  const objectUrl = URL.createObjectURL(blob);
  const byteSize = blob.size;
  memory.set(key, { objectUrl, byteSize, fetchedAt, lastUsedAt: Date.now() });
  memoryBytes += byteSize;
  evictMemoryLru();
  return objectUrl;
}

function ttlForKind(kind: GestureMediaCacheKind): number {
  return kind === 'preview' ? PREVIEW_TTL_MS : SESSION_TTL_MS;
}

function isExpired(fetchedAt: number, kind: GestureMediaCacheKind): boolean {
  return Date.now() - fetchedAt > ttlForKind(kind);
}

async function deleteIdbRow(id: string): Promise<void> {
  await gestureDb.mediaCache.delete(id);
}

async function evictIdbIfNeeded(kind: GestureMediaCacheKind): Promise<void> {
  const limit = kind === 'preview' ? MAX_PREVIEW_ENTRIES : MAX_SESSION_ENTRIES;
  const rows = await gestureDb.mediaCache.where('kind').equals(kind).sortBy('fetchedAt');
  if (rows.length <= limit) return;
  const excess = rows.length - limit;
  for (let i = 0; i < excess; i += 1) {
    const row = rows[i];
    if (row) await deleteIdbRow(row.id);
  }
}

/**
 * Session-tier decode warm — preview cards load via `<img>` already; warming preview
 * blobs here duplicated work and raced LRU eviction (stale blob: ERR_FILE_NOT_FOUND).
 */
export function warmGestureMediaBitmap(cacheKey: string): void {
  const run = () => {
    const entry = memory.get(cacheKey);
    if (!entry?.objectUrl.startsWith('blob:')) return;
    const img = new Image();
    img.onload = () => undefined;
    img.onerror = () => undefined;
    img.src = entry.objectUrl;
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 0);
  }
}

export async function getCachedGestureMediaObjectUrl(
  driveFileId: string,
  kind: GestureMediaCacheKind,
): Promise<string | null> {
  const key = cacheKey(driveFileId, kind);
  const mem = memory.get(key);
  if (mem && !isExpired(mem.fetchedAt, kind)) {
    touchMemory(key);
    return mem.objectUrl;
  }
  if (mem) {
    revokeObjectUrl(mem.objectUrl);
    memory.delete(key);
    memoryBytes -= mem.byteSize;
  }

  const pending = inflightGet.get(key);
  if (pending) return pending;

  const promise = (async () => {
    const row = await gestureDb.mediaCache.get(rowId(driveFileId, kind));
    if (!row || isExpired(row.fetchedAt, kind)) {
      if (row) await deleteIdbRow(row.id);
      return null;
    }

    const objectUrl = putMemory(key, row.blob, row.fetchedAt);
    if (kind === 'session') warmGestureMediaBitmap(key);
    return objectUrl;
  })().finally(() => {
    inflightGet.delete(key);
  });

  inflightGet.set(key, promise);
  return promise;
}

export async function putCachedGestureMediaBlob(
  driveFileId: string,
  kind: GestureMediaCacheKind,
  blob: Blob,
  width: number,
  mimeType: string,
): Promise<string> {
  const key = cacheKey(driveFileId, kind);
  const fetchedAt = Date.now();
  const id = rowId(driveFileId, kind);
  await gestureDb.mediaCache.put({
    id,
    driveFileId,
    kind,
    blob,
    width,
    mimeType,
    fetchedAt,
  });
  await evictIdbIfNeeded(kind);
  const objectUrl = putMemory(key, blob, fetchedAt);
  if (kind === 'session') warmGestureMediaBitmap(key);
  return objectUrl;
}

export async function clearGestureMediaCache(): Promise<void> {
  inflightGet.clear();
  for (const entry of memory.values()) revokeObjectUrl(entry.objectUrl);
  memory.clear();
  memoryBytes = 0;
  await gestureDb.mediaCache.clear();
}

export function peekCachedGestureMediaObjectUrl(
  driveFileId: string,
  kind: GestureMediaCacheKind,
): string | null {
  const key = cacheKey(driveFileId, kind);
  const mem = memory.get(key);
  if (!mem || isExpired(mem.fetchedAt, kind)) return null;
  touchMemory(key);
  return mem.objectUrl;
}
