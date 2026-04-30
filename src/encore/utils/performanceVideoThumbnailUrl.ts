import type { EncorePerformance } from '../types';
import { parseDriveFileIdFromUrlOrId } from '../drive/parseDriveFileUrl';
import { parseYoutubeVideoId } from '../youtube/parseYoutubeVideoUrl';

function youtubeMqThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`;
}

export function driveFileThumbnailWebUrl(fileId: string, width: 480 | 320 = 480): string {
  const sz = width === 320 ? 'w320' : 'w480';
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=${sz}`;
}

/**
 * Drive file id to use for thumbnails and OAuth `thumbnailLink` (actual video target before shortcut).
 */
export function performanceDriveVideoFileIdForThumbnail(p: EncorePerformance): string | null {
  const ext = p.externalVideoUrl?.trim();
  if (ext && parseYoutubeVideoId(ext)) return null;
  if (ext) {
    const fromExternal = parseDriveFileIdFromUrlOrId(ext);
    if (fromExternal) return fromExternal;
    return p.videoTargetDriveFileId?.trim() || p.videoShortcutDriveFileId?.trim() || null;
  }
  return p.videoTargetDriveFileId?.trim() || p.videoShortcutDriveFileId?.trim() || null;
}

/**
 * Best-effort still image for a performance’s linked video.
 * YouTube → i.ytimg.com; Drive → `drive.google.com/thumbnail` (no OAuth; may 403 without a matching Google session).
 * Prefer {@link getDriveThumbnailLinkCached} + OAuth in UI when a token is available.
 */
export function performanceVideoThumbnailUrl(p: EncorePerformance): string | null {
  const ext = p.externalVideoUrl?.trim();
  if (ext) {
    const yt = parseYoutubeVideoId(ext);
    if (yt) return youtubeMqThumbnail(yt);
  }
  const id = performanceDriveVideoFileIdForThumbnail(p);
  if (id) return driveFileThumbnailWebUrl(id, 480);
  return null;
}
