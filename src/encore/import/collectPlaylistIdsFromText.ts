import { parseSpotifyPlaylistId } from '../spotify/parseSpotifyPlaylistUrl';
import { parseYouTubePlaylistId } from '../youtube/parseYouTubePlaylistUrl';

/** Split pasted blob on newlines or commas; trim and drop empties. */
export function splitPlaylistPaste(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface MixedPlaylistPasteResult {
  spotifyIds: string[];
  youtubeIds: string[];
}

/**
 * Classify one segment as Spotify, YouTube, or both (rare). URLs are routed by hostname/query hints.
 * Bare ids that match both parsers (e.g. 22 alphanumeric chars) are treated as Spotify playlist ids.
 */
function interpretPlaylistLine(line: string): { spotifyId: string | null; youtubeId: string | null } {
  const t = line.trim();
  if (!t) return { spotifyId: null, youtubeId: null };
  const spotifyIntent = /open\.spotify\.com|spotify:/i.test(t);
  const youtubeIntent = /youtube\.com|youtu\.be|[?&]list=/i.test(t);

  if (spotifyIntent && youtubeIntent) {
    return {
      spotifyId: parseSpotifyPlaylistId(t),
      youtubeId: parseYouTubePlaylistId(t),
    };
  }
  if (spotifyIntent) {
    return { spotifyId: parseSpotifyPlaylistId(t), youtubeId: null };
  }
  if (youtubeIntent) {
    return { spotifyId: null, youtubeId: parseYouTubePlaylistId(t) };
  }

  const sp = parseSpotifyPlaylistId(t);
  const yt = parseYouTubePlaylistId(t);
  if (sp && !yt) return { spotifyId: sp, youtubeId: null };
  if (yt && !sp) return { spotifyId: null, youtubeId: yt };
  if (!sp && !yt) return { spotifyId: null, youtubeId: null };
  // Ambiguous: both parsers accept (e.g. bare 22-char alphanumeric)
  if (/^[A-Za-z0-9]{22}$/.test(t)) {
    return { spotifyId: sp, youtubeId: null };
  }
  return { spotifyId: null, youtubeId: yt };
}

/** Unique Spotify / YouTube playlist ids from one mixed paste, in first-seen order per platform. */
export function collectUniquePlaylistIdsFromMixedPaste(raw: string): MixedPlaylistPasteResult {
  const seenSp = new Set<string>();
  const seenYt = new Set<string>();
  const spotifyIds: string[] = [];
  const youtubeIds: string[] = [];
  for (const line of splitPlaylistPaste(raw)) {
    const { spotifyId, youtubeId } = interpretPlaylistLine(line);
    if (spotifyId && !seenSp.has(spotifyId)) {
      seenSp.add(spotifyId);
      spotifyIds.push(spotifyId);
    }
    if (youtubeId && !seenYt.has(youtubeId)) {
      seenYt.add(youtubeId);
      youtubeIds.push(youtubeId);
    }
  }
  return { spotifyIds, youtubeIds };
}

/** Unique Spotify playlist ids in first-seen order (same rules as mixed paste, Spotify side only). */
export function collectUniqueSpotifyPlaylistIds(raw: string): string[] {
  return collectUniquePlaylistIdsFromMixedPaste(raw).spotifyIds;
}

/** Unique YouTube playlist ids in first-seen order (same rules as mixed paste, YouTube side only). */
export function collectUniqueYouTubePlaylistIds(raw: string): string[] {
  return collectUniquePlaylistIdsFromMixedPaste(raw).youtubeIds;
}
