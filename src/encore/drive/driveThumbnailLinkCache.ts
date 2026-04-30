import { driveResolveThumbnailLink } from './driveFetch';

/** `thumbnailLink` values are short-lived; refresh proactively before Google invalidates them. */
const POSITIVE_TTL_MS = 45 * 60 * 1000;
/** Avoid hammering Drive when a file truly has no thumbnail. */
const NEGATIVE_TTL_MS = 120 * 1000;

type CacheEntry =
  | { kind: 'hit'; url: string; expiresAt: number }
  | { kind: 'miss'; expiresAt: number };

const store = new Map<string, CacheEntry>();

export function invalidateDriveThumbnailLinkCache(fileId: string): void {
  const id = fileId.trim();
  if (id) store.delete(id);
}

/**
 * Cached `files` thumbnailLink resolution (one Drive metadata read per cache window per file id).
 */
export async function getDriveThumbnailLinkCached(accessToken: string, fileId: string): Promise<string | null> {
  const id = fileId.trim();
  if (!id) return null;
  const now = Date.now();
  const hit = store.get(id);
  if (hit && hit.expiresAt > now) {
    return hit.kind === 'hit' ? hit.url : null;
  }
  try {
    const url = await driveResolveThumbnailLink(accessToken, id);
    if (url) {
      store.set(id, { kind: 'hit', url, expiresAt: now + POSITIVE_TTL_MS });
      return url;
    }
    store.set(id, { kind: 'miss', expiresAt: now + NEGATIVE_TTL_MS });
    return null;
  } catch {
    store.set(id, { kind: 'miss', expiresAt: now + NEGATIVE_TTL_MS });
    return null;
  }
}
