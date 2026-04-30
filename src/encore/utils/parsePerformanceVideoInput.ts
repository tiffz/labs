import { parseDriveFileIdFromUrlOrId } from '../drive/parseDriveFileUrl';
import { parseYoutubeVideoId } from '../youtube/parseYoutubeVideoUrl';

export type ParsedPerformanceVideo =
  | { kind: 'youtube'; videoId: string }
  | { kind: 'drive'; fileId: string }
  | { kind: 'external'; url: string }
  | { kind: 'empty' };

export function parsePerformanceVideoInput(raw: string): ParsedPerformanceVideo {
  const s = raw.trim();
  if (!s) return { kind: 'empty' };
  const yt = parseYoutubeVideoId(s);
  if (yt) return { kind: 'youtube', videoId: yt };
  const drive = parseDriveFileIdFromUrlOrId(s);
  if (drive) return { kind: 'drive', fileId: drive };
  if (/^https?:\/\//i.test(s)) return { kind: 'external', url: s };
  return { kind: 'empty' };
}
