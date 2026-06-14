/** Extract a Drive folder id from a pasted URL or raw id string. */
export function parseDriveFolderIdFromInput(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const foldersMatch = t.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (foldersMatch?.[1]) return foldersMatch[1];
  const idParam = t.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParam?.[1]) return idParam[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(t)) return t;
  return null;
}
