import { parseDriveFileIdFromUrlOrId } from '../drive/parseDriveFileUrl';
import { parseSpotifyTrackId } from '../spotify/parseSpotifyTrackUrl';
import { parseYoutubeVideoId } from '../youtube/parseYoutubeVideoUrl';
import { parseStanzaPlaybackUrl } from './parseStanzaPlaybackUrl';

export type ParsedEncoreMediaUrl =
  | { kind: 'spotify'; trackId: string }
  | { kind: 'youtube'; videoId: string; rawInput: string }
  | { kind: 'drive'; driveFileId: string; label?: string }
  | { kind: 'stanza_local_fingerprint'; fingerprint: string };

/**
 * Classify a pasted URL or id as Spotify, YouTube, Drive, or Stanza (resolving Stanza to its
 * underlying YouTube or Drive target when possible).
 */
export function parseEncoreMediaUrlInput(raw: string): ParsedEncoreMediaUrl | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const stanza = parseStanzaPlaybackUrl(trimmed);
  if (stanza) {
    if (stanza.kind === 'youtube') {
      return { kind: 'youtube', videoId: stanza.videoId, rawInput: trimmed };
    }
    if (stanza.kind === 'drive') {
      return {
        kind: 'drive',
        driveFileId: stanza.driveFileId,
        label: stanza.driveTitle ?? 'Drive file',
      };
    }
    return { kind: 'stanza_local_fingerprint', fingerprint: stanza.fingerprint };
  }

  const spotifyTrackId = parseSpotifyTrackId(trimmed);
  if (spotifyTrackId) return { kind: 'spotify', trackId: spotifyTrackId };

  const youtubeVideoId = parseYoutubeVideoId(trimmed);
  if (youtubeVideoId) return { kind: 'youtube', videoId: youtubeVideoId, rawInput: trimmed };

  const driveFileId = parseDriveFileIdFromUrlOrId(trimmed);
  if (driveFileId) return { kind: 'drive', driveFileId, label: 'Drive file' };

  return null;
}

/** True when the field value is likely a URL/id paste rather than a Spotify text search. */
export function looksLikeEncoreMediaUrlInput(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (/^https?:\/\//i.test(t)) return true;
  if (/\/stanza\/?(\?|$)/i.test(t)) return true;
  if (/spotify\.com\/track\//i.test(t) || /^spotify:track:/i.test(t)) return true;
  if (/youtu\.be\//i.test(t) || /youtube\.com\//i.test(t)) return true;
  if (/drive\.google\.com\//i.test(t)) return true;
  if (/^[A-Za-z0-9_-]{22}$/.test(t)) return true;
  if (/^[a-zA-Z0-9_-]{11}$/.test(t)) return true;
  return false;
}
