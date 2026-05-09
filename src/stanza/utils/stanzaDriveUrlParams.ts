import { parseYoutubeVideoId } from './parseYoutubeVideoId';

/** Query key for opening a Google Drive file in Stanza (inter-app from Encore, or shared links). */
export const STANZA_DRIVE_FILE_QUERY = 'df';
export const STANZA_DRIVE_TITLE_QUERY = 'driveTitle';

export function parseStanzaDriveFileIdParam(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (t.length < 10 || t.length > 128) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(t)) return null;
  return t;
}

/** True when `df` has non-whitespace content (even if {@link parseStanzaDriveFileIdParam} rejects it). */
export function hasStanzaDriveDeepLinkQuery(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = new URLSearchParams(window.location.search).get(STANZA_DRIVE_FILE_QUERY)?.trim();
  return Boolean(raw);
}

export function readStanzaDriveBootstrapFromLocation(): {
  youtubeId: string | null;
  driveFileId: string | null;
  driveTitle: string | null;
} {
  const rawV = new URLSearchParams(window.location.search).get('v');
  const youtubeId = parseYoutubeVideoId(rawV ?? '');
  if (youtubeId) {
    return { youtubeId, driveFileId: null, driveTitle: null };
  }
  const sp = new URLSearchParams(window.location.search);
  const driveFileId = parseStanzaDriveFileIdParam(sp.get(STANZA_DRIVE_FILE_QUERY));
  const driveTitle = sp.get(STANZA_DRIVE_TITLE_QUERY)?.trim() || null;
  return { youtubeId: null, driveFileId, driveTitle };
}


const STANZA_YOUTUBE_V_QUERY = 'v';

/**
 * Single history replace for Stanza playback deep links: YouTube `v` and/or Drive `df` + `driveTitle`.
 * YouTube wins when `youtubeId` is set (Drive params are stripped).
 */
export function replaceStanzaPlaybackUrlSearchParams(opts: {
  youtubeId: string | null;
  driveFileId: string | null;
  driveTitle: string | null;
}): void {
  const u = new URL(window.location.href);
  if (opts.youtubeId) {
    u.searchParams.set(STANZA_YOUTUBE_V_QUERY, opts.youtubeId);
    u.searchParams.delete(STANZA_DRIVE_FILE_QUERY);
    u.searchParams.delete(STANZA_DRIVE_TITLE_QUERY);
  } else {
    u.searchParams.delete(STANZA_YOUTUBE_V_QUERY);
    if (opts.driveFileId) {
      u.searchParams.set(STANZA_DRIVE_FILE_QUERY, opts.driveFileId);
      if (opts.driveTitle) u.searchParams.set(STANZA_DRIVE_TITLE_QUERY, opts.driveTitle);
      else u.searchParams.delete(STANZA_DRIVE_TITLE_QUERY);
    } else {
      u.searchParams.delete(STANZA_DRIVE_FILE_QUERY);
      u.searchParams.delete(STANZA_DRIVE_TITLE_QUERY);
    }
  }
  window.history.replaceState(null, '', `${u.pathname}${u.search}${u.hash}`);
}
