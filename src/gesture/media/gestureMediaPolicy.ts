import { driveResolveThumbnailLink } from '../../shared/drive/driveFetch';
import type { GestureMediaCacheKind } from '../types';
import { fetchDriveImageBlob, probeImageUrlLoads } from './gestureDriveImageLoad';
import {
  getCachedGestureMediaObjectUrl,
  peekCachedGestureMediaObjectUrl,
  putCachedGestureMediaBlob,
} from './gestureMediaCache';
import {
  buildDriveThumbnailFallbackUrl,
  scaleDriveThumbnailUrl,
} from './gestureReferenceImageUrl';

/** Small thumbs for collection cards — keep bytes low for fast paint. */
export const GESTURE_PREVIEW_THUMB_WIDTH = 320;

/**
 * Canonical resolution order per tier. See `src/gesture/AGENTS.md` § Media tiers.
 * Preview never starts with alt=media — card grids fan out dozens of parallel requests.
 */
export const GESTURE_MEDIA_TIER = {
  preview: {
    kind: 'preview' as const,
    width: GESTURE_PREVIEW_THUMB_WIDTH,
    steps: ['memory', 'idb', 'oauth-thumbnail', 'public-thumbnail', 'alt-media-blob'] as const,
  },
  session: {
    kind: 'session' as const,
    steps: ['session-prefetch', 'idb', 'oauth-thumbnail-img', 'alt-media-blob'] as const,
  },
} as const;

/** Preview-tier network fetch — fast https thumbnails before full-file alt=media. */
export async function resolveGesturePreviewTierUrl(
  accessToken: string | null,
  fileId: string,
  width = GESTURE_PREVIEW_THUMB_WIDTH,
): Promise<string> {
  const fallback = buildDriveThumbnailFallbackUrl(fileId, width);

  if (accessToken) {
    try {
      const link = await driveResolveThumbnailLink(accessToken, fileId);
      if (link) {
        const scaled = scaleDriveThumbnailUrl(link, width);
        if (await probeImageUrlLoads(scaled)) return scaled;
      }
    } catch {
      /* fall through */
    }
  }

  if (!accessToken || (await probeImageUrlLoads(fallback))) {
    return fallback;
  }

  const idbUrl = await fetchAndCacheGestureMediaBlob(accessToken, fileId, 'preview', width);
  return idbUrl ?? fallback;
}

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
