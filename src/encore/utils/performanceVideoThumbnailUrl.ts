import type { EncorePerformance } from '../types';
import { parseYoutubeVideoId } from '../youtube/parseYoutubeVideoUrl';

function youtubeMqThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`;
}

function driveFileThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w480`;
}

/**
 * Best-effort still image for a performance’s linked video.
 * YouTube links resolve to i.ytimg.com; Drive file ids use Google’s thumbnail endpoint (may 403 if the file is not accessible to the signed-in user).
 */
export function performanceVideoThumbnailUrl(p: EncorePerformance): string | null {
  const ext = p.externalVideoUrl?.trim();
  const driveId = p.videoShortcutDriveFileId?.trim() || p.videoTargetDriveFileId?.trim();

  if (ext) {
    const yt = parseYoutubeVideoId(ext);
    if (yt) return youtubeMqThumbnail(yt);
    if (driveId) return driveFileThumbnailUrl(driveId);
    return null;
  }
  if (driveId) return driveFileThumbnailUrl(driveId);
  return null;
}
