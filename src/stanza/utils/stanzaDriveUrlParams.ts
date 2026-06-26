import { parseYoutubeVideoId } from './parseYoutubeVideoId';

/** Query key for opening a Google Drive file in Stanza (inter-app from Encore, or shared links). */
export const STANZA_DRIVE_FILE_QUERY = 'df';
export const STANZA_DRIVE_TITLE_QUERY = 'driveTitle';
/** Query key for local uploads (Find the Beat SHA256 fingerprint or Stanza size/duration key). */
export const STANZA_MEDIA_FINGERPRINT_QUERY = 'f';

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

export function parseStanzaMediaFingerprintParam(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (/^[a-f0-9]{64}$/i.test(t)) return t.toLowerCase();
  if (/^\d+:/.test(t)) return t;
  return null;
}

/** True when `f` has non-whitespace content (even if {@link parseStanzaMediaFingerprintParam} rejects it). */
export function hasStanzaMediaFingerprintDeepLinkQuery(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = new URLSearchParams(window.location.search).get(STANZA_MEDIA_FINGERPRINT_QUERY)?.trim();
  return Boolean(raw);
}

export function readStanzaDriveBootstrapFromLocation(): {
  youtubeId: string | null;
  driveFileId: string | null;
  driveTitle: string | null;
  mediaFingerprint: string | null;
} {
  const rawV = new URLSearchParams(window.location.search).get('v');
  const youtubeId = parseYoutubeVideoId(rawV ?? '');
  if (youtubeId) {
    return { youtubeId, driveFileId: null, driveTitle: null, mediaFingerprint: null };
  }
  const sp = new URLSearchParams(window.location.search);
  const driveFileId = parseStanzaDriveFileIdParam(sp.get(STANZA_DRIVE_FILE_QUERY));
  const driveTitle = sp.get(STANZA_DRIVE_TITLE_QUERY)?.trim() || null;
  if (driveFileId) {
    return { youtubeId: null, driveFileId, driveTitle, mediaFingerprint: null };
  }
  const mediaFingerprint = parseStanzaMediaFingerprintParam(sp.get(STANZA_MEDIA_FINGERPRINT_QUERY));
  return { youtubeId: null, driveFileId: null, driveTitle: null, mediaFingerprint };
}


const STANZA_YOUTUBE_V_QUERY = 'v';

export interface StanzaPlaybackUrlParams {
  youtubeId: string | null;
  driveFileId: string | null;
  driveTitle: string | null;
  mediaFingerprint: string | null;
}

/**
 * Build the next URL for the given playback params without mutating browser state. Returns the
 * `pathname?search#hash` string suitable for `history.pushState` / `replaceState`.
 *
 * YouTube wins when `youtubeId` is set (Drive params are stripped). Other unrelated query
 * parameters (e.g. `?debug`) are preserved.
 */
export function stanzaSongHref(opts: StanzaPlaybackUrlParams): string {
  return buildStanzaPlaybackUrl(opts);
}

function buildStanzaPlaybackUrl(opts: StanzaPlaybackUrlParams): string {
  const u = new URL(window.location.href);
  const mediaFingerprint = opts.mediaFingerprint?.trim() || null;
  if (opts.youtubeId) {
    u.searchParams.set(STANZA_YOUTUBE_V_QUERY, opts.youtubeId);
    u.searchParams.delete(STANZA_DRIVE_FILE_QUERY);
    u.searchParams.delete(STANZA_DRIVE_TITLE_QUERY);
    u.searchParams.delete(STANZA_MEDIA_FINGERPRINT_QUERY);
  } else {
    u.searchParams.delete(STANZA_YOUTUBE_V_QUERY);
    if (opts.driveFileId) {
      u.searchParams.set(STANZA_DRIVE_FILE_QUERY, opts.driveFileId);
      if (opts.driveTitle) u.searchParams.set(STANZA_DRIVE_TITLE_QUERY, opts.driveTitle);
      else u.searchParams.delete(STANZA_DRIVE_TITLE_QUERY);
      u.searchParams.delete(STANZA_MEDIA_FINGERPRINT_QUERY);
    } else if (mediaFingerprint) {
      u.searchParams.delete(STANZA_DRIVE_FILE_QUERY);
      u.searchParams.delete(STANZA_DRIVE_TITLE_QUERY);
      u.searchParams.set(STANZA_MEDIA_FINGERPRINT_QUERY, mediaFingerprint);
    } else {
      u.searchParams.delete(STANZA_DRIVE_FILE_QUERY);
      u.searchParams.delete(STANZA_DRIVE_TITLE_QUERY);
      u.searchParams.delete(STANZA_MEDIA_FINGERPRINT_QUERY);
    }
  }
  return `${u.pathname}${u.search}${u.hash}`;
}

/**
 * Single history replace for Stanza playback deep links: YouTube `v` and/or Drive `df` + `driveTitle`.
 * Use this for **passive** URL syncing — keeping the address bar in sync after a state change
 * that wasn't a user navigation (initial deep-link bootstrap, popstate-driven selection, async
 * Drive resolution). Does **not** add a history entry.
 */
export function replaceStanzaPlaybackUrlSearchParams(opts: StanzaPlaybackUrlParams): void {
  window.history.replaceState(null, '', buildStanzaPlaybackUrl(opts));
}

/**
 * Push a new history entry for a Stanza playback navigation (library row click, "Back to
 * library" button, opening a freshly imported song). This is what makes the **browser Back
 * button** navigate **inside** the app instead of leaving Stanza for the previous site.
 *
 * Skips the push when the URL would not actually change — avoids stacking duplicate entries
 * when a callback fires twice for the same target song.
 */
export function pushStanzaPlaybackUrlSearchParams(opts: StanzaPlaybackUrlParams): void {
  const next = buildStanzaPlaybackUrl(opts);
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  window.history.pushState(null, '', next);
}
