/** Extract Google Drive file id from common URL shapes or raw id. */
export function parseDriveFileIdFromUrlOrId(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^[A-Za-z0-9_-]{25,}$/.test(s) && !s.includes('/')) return s;
  const open = s.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([A-Za-z0-9_-]+)/);
  if (open?.[1]) return open[1];
  const uc = s.match(/\/uc\?[^#]*id=([A-Za-z0-9_-]+)/);
  if (uc?.[1]) return uc[1];
  return null;
}

/** Extract folder id from Drive folder URLs or a raw folder id string. */
export function parseDriveFolderIdFromUrlOrId(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const folder = s.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]+)/);
  if (folder?.[1]) return folder[1];
  if (/^[A-Za-z0-9_-]{25,}$/.test(s) && !s.includes('/')) return s;
  return null;
}
