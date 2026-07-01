import { parseYoutubeVideoId } from '../youtube/parseYoutubeVideoUrl';

/** Query keys for Stanza playback deep links (see `src/stanza/utils/stanzaDriveUrlParams.ts`). */
export const STANZA_DRIVE_FILE_QUERY = 'df';
export const STANZA_DRIVE_TITLE_QUERY = 'driveTitle';
export const STANZA_YOUTUBE_V_QUERY = 'v';
export const STANZA_MEDIA_FINGERPRINT_QUERY = 'f';

export function parseStanzaDriveFileIdParam(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (t.length < 10 || t.length > 128) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(t)) return null;
  return t;
}

export function parseStanzaMediaFingerprintParam(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (/^[a-f0-9]{64}$/i.test(t)) return t.toLowerCase();
  if (/^\d+:/.test(t)) return t;
  return null;
}

export type ParsedStanzaPlaybackUrl =
  | { kind: 'youtube'; videoId: string }
  | { kind: 'drive'; driveFileId: string; driveTitle: string | null }
  | { kind: 'local_fingerprint'; fingerprint: string };

/** Resolve YouTube `v`, Drive `df`, or local `f` from a Stanza app URL. */
export function parseStanzaPlaybackUrl(input: string): ParsedStanzaPlaybackUrl | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = trimmed.includes('://') ? new URL(trimmed) : new URL(trimmed, 'https://labs.tiffzhang.com');
  } catch {
    return null;
  }

  if (!url.pathname.replace(/\/+$/, '').endsWith('/stanza')) return null;

  const youtubeId = parseYoutubeVideoId(url.searchParams.get(STANZA_YOUTUBE_V_QUERY) ?? '');
  if (youtubeId) return { kind: 'youtube', videoId: youtubeId };

  const driveFileId = parseStanzaDriveFileIdParam(url.searchParams.get(STANZA_DRIVE_FILE_QUERY));
  if (driveFileId) {
    const driveTitle = url.searchParams.get(STANZA_DRIVE_TITLE_QUERY)?.trim() || null;
    return { kind: 'drive', driveFileId, driveTitle };
  }

  const fingerprint = parseStanzaMediaFingerprintParam(url.searchParams.get(STANZA_MEDIA_FINGERPRINT_QUERY));
  if (fingerprint) return { kind: 'local_fingerprint', fingerprint };

  return null;
}
