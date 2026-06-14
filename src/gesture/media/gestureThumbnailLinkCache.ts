import { driveResolveThumbnailLink } from '../../shared/drive/driveFetch';
import {
  buildDriveThumbnailFallbackUrl,
  resolveReferenceImageDisplayWidth,
  scaleDriveThumbnailUrl,
} from './gestureReferenceImageUrl';

const HIT_TTL_MS = 45 * 60 * 1000;
const MISS_TTL_MS = 2 * 60 * 1000;

type CacheEntry = { url: string; expiresAt: number };

const cache = new Map<string, CacheEntry>();

function readCache(fileId: string): string | null {
  const row = cache.get(fileId);
  if (!row) return null;
  if (Date.now() > row.expiresAt) {
    cache.delete(fileId);
    return null;
  }
  return row.url;
}

function writeCache(fileId: string, url: string, hit: boolean): void {
  cache.set(fileId, {
    url,
    expiresAt: Date.now() + (hit ? HIT_TTL_MS : MISS_TTL_MS),
  });
}

export async function resolveGestureReferenceImageUrl(
  accessToken: string | null,
  fileId: string,
): Promise<string> {
  const width = resolveReferenceImageDisplayWidth();
  const fallback = buildDriveThumbnailFallbackUrl(fileId, width);
  if (!accessToken) return fallback;

  const cached = readCache(fileId);
  if (cached) return scaleDriveThumbnailUrl(cached, width);

  try {
    const link = await driveResolveThumbnailLink(accessToken, fileId);
    if (link) {
      const scaled = scaleDriveThumbnailUrl(link, width);
      writeCache(fileId, link, true);
      return scaled;
    }
  } catch {
    /* fall through */
  }
  writeCache(fileId, fallback, false);
  return fallback;
}
