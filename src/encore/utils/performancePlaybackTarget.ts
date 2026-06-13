import { parseYoutubeVideoId } from '../youtube/parseYoutubeVideoUrl';
import type { EncoreMediaPlaybackTarget } from '../media/encorePlayableMedia';
import {
  encoreDriveMediaPlaybackId,
  encoreYoutubeMediaPlaybackId,
} from '../media/encorePlayableMedia';
import type { EncorePerformance, EncorePerformanceVideo } from '../types';
import { getPrimaryPerformanceVideo } from './performanceVideoModel';

function videoOpenParts(video: EncorePerformanceVideo): {
  driveFileId?: string;
  youtubeVideoId?: string;
  externalUrl?: string;
} {
  const ext = video.externalVideoUrl?.trim();
  if (ext) {
    const yt = parseYoutubeVideoId(ext);
    if (yt) return { youtubeVideoId: yt };
    return { externalUrl: ext };
  }
  const driveId = video.videoShortcutDriveFileId?.trim() || video.videoTargetDriveFileId?.trim();
  if (driveId) return { driveFileId: driveId };
  return {};
}

export function performanceVideoPlaybackTarget(
  performance: EncorePerformance,
  video?: EncorePerformanceVideo | null,
  titleParts?: { songTitle?: string; venue?: string },
): EncoreMediaPlaybackTarget | null {
  const v = video ?? getPrimaryPerformanceVideo(performance);
  if (!v) return null;
  const parts = videoOpenParts(v);
  const subtitle = [performance.date, titleParts?.venue ?? performance.venueTag].filter(Boolean).join(' · ');
  const title = titleParts?.songTitle?.trim() || 'Performance video';

  if (parts.youtubeVideoId) {
    return {
      playbackId: encoreYoutubeMediaPlaybackId(parts.youtubeVideoId),
      kind: 'youtube',
      title,
      subtitle,
      youtubeVideoId: parts.youtubeVideoId,
    };
  }
  if (parts.driveFileId) {
    return {
      playbackId: encoreDriveMediaPlaybackId(parts.driveFileId),
      kind: 'drive-video',
      title,
      subtitle,
      driveFileId: parts.driveFileId,
      mimeType: 'video/mp4',
    };
  }
  return null;
}
