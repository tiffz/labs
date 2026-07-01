import { isDriveFolderBrowserUrl, parseDriveFileIdFromUrlOrId } from '../drive/parseDriveFileUrl';
import { parseStanzaPlaybackUrl } from '../repertoire/parseStanzaPlaybackUrl';
import { parseYoutubeVideoId } from '../youtube/parseYoutubeVideoUrl';

export type ParsedPerformanceVideo =
  | { kind: 'youtube'; videoId: string }
  | { kind: 'drive-folder' }
  | { kind: 'drive'; fileId: string }
  | { kind: 'external'; url: string }
  | { kind: 'empty' };

export function parsePerformanceVideoInput(raw: string): ParsedPerformanceVideo {
  const s = raw.trim();
  if (!s) return { kind: 'empty' };

  const stanza = parseStanzaPlaybackUrl(s);
  if (stanza?.kind === 'youtube') return { kind: 'youtube', videoId: stanza.videoId };
  if (stanza?.kind === 'drive') return { kind: 'drive', fileId: stanza.driveFileId };

  const yt = parseYoutubeVideoId(s);
  if (yt) return { kind: 'youtube', videoId: yt };
  if (isDriveFolderBrowserUrl(s)) return { kind: 'drive-folder' };
  const drive = parseDriveFileIdFromUrlOrId(s);
  if (drive) return { kind: 'drive', fileId: drive };
  if (/^https?:\/\//i.test(s)) return { kind: 'external', url: s };
  return { kind: 'empty' };
}
