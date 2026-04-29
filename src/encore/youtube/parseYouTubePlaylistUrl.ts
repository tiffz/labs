/** Extract YouTube playlist id from paste (watch URL with list=, playlist URL, or raw id). */
export function parseYouTubePlaylistId(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    const list = u.searchParams.get('list');
    if (list && /^[a-zA-Z0-9_-]+$/.test(list)) return list;
    if (u.hostname.includes('youtube.com') && u.pathname.startsWith('/playlist')) {
      const l = u.searchParams.get('list');
      if (l) return l;
    }
  } catch {
    /* not absolute URL */
  }
  const qp = s.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (qp?.[1]) return qp[1];
  if (/^[a-zA-Z0-9_-]{13,34}$/.test(s)) return s;
  return null;
}
