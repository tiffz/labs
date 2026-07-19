import { hostnameMatches } from '../../shared/url/safeUrlHost';
import { driveFileWebUrl } from '../drive/driveWebUrls';
import type { EncorePerformance, EncorePerformanceVideo } from '../types';
import { parseYoutubeVideoId } from '../youtube/parseYoutubeVideoUrl';
import { getPrimaryPerformanceVideo } from './performanceVideoModel';

function performanceVideoOpenUrlFromVideo(video: EncorePerformanceVideo): string | null {
  const ext = video.externalVideoUrl?.trim();
  if (ext) return ext;
  const id = video.videoShortcutDriveFileId?.trim() || video.videoTargetDriveFileId?.trim();
  if (id) return driveFileWebUrl(id);
  return null;
}

function performanceVideoOpenLabelFromVideo(video: EncorePerformanceVideo): string | null {
  const ext = video.externalVideoUrl?.trim();
  if (ext && parseYoutubeVideoId(ext)) return 'Open in YouTube';
  if (video.videoShortcutDriveFileId?.trim() || video.videoTargetDriveFileId?.trim()) {
    return 'Open in Drive';
  }
  if (ext) return 'Open link';
  const url = performanceVideoOpenUrlFromVideo(video);
  if (url && hostnameMatches(url, 'drive.google.com')) return 'Open in Drive';
  if (url && parseYoutubeVideoId(url)) return 'Open in YouTube';
  return url ? 'Open link' : null;
}

/** URL to open one clip in a performance video stack. */
export function performanceVideoOpenUrlForVideo(video: EncorePerformanceVideo): string | null {
  return performanceVideoOpenUrlFromVideo(video);
}

/** Accessible label for opening one clip externally. */
export function performanceVideoOpenLabelForVideo(video: EncorePerformanceVideo): string | null {
  return performanceVideoOpenLabelFromVideo(video);
}

/** URL to open a performance’s linked video (Drive file or external / YouTube). Uses primary video when stacked. */
export function performanceVideoOpenUrl(p: EncorePerformance): string | null {
  const primary = getPrimaryPerformanceVideo(p);
  if (!primary) return null;
  return performanceVideoOpenUrlFromVideo(primary);
}

/** Accessible label for the external-open control (Drive vs YouTube vs generic link). */
export function performanceVideoOpenLabel(p: EncorePerformance): string | null {
  const primary = getPrimaryPerformanceVideo(p);
  if (!primary) return null;
  const ext = primary.externalVideoUrl?.trim();
  if (ext && parseYoutubeVideoId(ext)) return 'Open in YouTube';
  if (primary.videoShortcutDriveFileId?.trim() || primary.videoTargetDriveFileId?.trim()) {
    return 'Open in Drive';
  }
  if (ext) return 'Open link';
  const url = performanceVideoOpenUrlFromVideo(primary);
  if (url && hostnameMatches(url, 'drive.google.com')) return 'Open in Drive';
  if (url && parseYoutubeVideoId(url)) return 'Open in YouTube';
  return url ? 'Open link' : null;
}
