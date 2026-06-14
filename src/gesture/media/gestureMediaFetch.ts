import {
  fetchDriveImageBlob,
  probeImageUrlLoads,
} from './gestureDriveImageLoad';
import {
  getCachedGestureMediaObjectUrl,
  peekCachedGestureMediaObjectUrl,
  putCachedGestureMediaBlob,
} from './gestureMediaCache';
import { buildDriveThumbnailFallbackUrl } from './gestureReferenceImageUrl';
import type { GestureMediaCacheKind } from '../types';

/**
 * Persist preview/session bytes via OAuth alt=media (never fetch() thumbnail URLs — CORS blocks them).
 * Returns a blob object URL when cached; https thumbnail fallback for display-only when unauthenticated.
 */
export async function fetchAndCacheGestureMediaBlob(
  accessToken: string | null,
  driveFileId: string,
  kind: GestureMediaCacheKind,
  width: number,
  fileName?: string,
): Promise<string | null> {
  const cached = await getCachedGestureMediaObjectUrl(driveFileId, kind);
  if (cached) return cached;

  if (accessToken) {
    try {
      const { blob, mimeType } = await fetchDriveImageBlob(accessToken, driveFileId, fileName);
      return putCachedGestureMediaBlob(driveFileId, kind, blob, width, mimeType);
    } catch {
      /* fall through */
    }
  }

  const fallback = buildDriveThumbnailFallbackUrl(driveFileId, width);
  if (await probeImageUrlLoads(fallback)) {
    return fallback;
  }
  return null;
}

export function peekCachedGestureMediaUrl(
  driveFileId: string,
  kind: GestureMediaCacheKind,
): string | null {
  return peekCachedGestureMediaObjectUrl(driveFileId, kind);
}
