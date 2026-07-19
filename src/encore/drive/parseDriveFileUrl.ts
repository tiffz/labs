import { hostnameMatches, tryParseUrl } from '../../shared/url/safeUrlHost';

/** True when the URL is a Drive **folder** browser link (not a file). */
export function isDriveFolderBrowserUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s || !hostnameMatches(s, 'drive.google.com')) return false;
  const url = tryParseUrl(s);
  if (!url) return false;
  return /\/drive\/(?:u\/\d+\/)?folders\//i.test(url.pathname);
}

/** Extract Google Drive file id from common URL shapes or raw id. */
export function parseDriveFileIdFromUrlOrId(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^[A-Za-z0-9_-]{25,}$/.test(s) && !s.includes('/')) return s;

  const url = tryParseUrl(s);
  if (url && hostnameMatches(s, 'drive.google.com')) {
    const fileMatch = url.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/i);
    if (fileMatch?.[1]) return fileMatch[1];
    const openId = url.searchParams.get('id');
    if (openId && /^[A-Za-z0-9_-]+$/.test(openId)) return openId;
  }
  return null;
}

/** Extract folder id from Drive folder URLs or a raw folder id string. */
export function parseDriveFolderIdFromUrlOrId(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const url = tryParseUrl(s);
  if (url && hostnameMatches(s, 'drive.google.com')) {
    const folder = url.pathname.match(/\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]+)/i);
    if (folder?.[1]) return folder[1];
  }

  if (/^[A-Za-z0-9_-]{25,}$/.test(s) && !s.includes('/')) return s;
  return null;
}

/**
 * Folder id from multiline paste / URL / raw id, matching bulk-import heuristics:
 * folder URLs and raw ids via {@link parseDriveFolderIdFromUrlOrId}, then a single-line
 * token tried with {@link parseDriveFileIdFromUrlOrId} (e.g. raw id shapes folder parser already accepts).
 */
export function parseDriveFolderIdFromUserInput(raw: string): string | null {
  const fromFolder = parseDriveFolderIdFromUrlOrId(raw);
  if (fromFolder) return fromFolder;
  const t = raw.trim();
  if (/^\s*[^/]+\s*$/.test(t)) return parseDriveFileIdFromUrlOrId(t);
  return null;
}
