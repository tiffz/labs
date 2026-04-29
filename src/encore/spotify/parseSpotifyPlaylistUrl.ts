/** Extract Spotify playlist id from paste (URL, URI, or raw id). */
export function parseSpotifyPlaylistId(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const fromWeb = s.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?playlist\/([A-Za-z0-9]+)/);
  if (fromWeb?.[1]) return fromWeb[1];
  const fromUri = s.match(/spotify:playlist:([A-Za-z0-9]+)/);
  if (fromUri?.[1]) return fromUri[1];
  if (/^[A-Za-z0-9]{22}$/.test(s)) return s;
  return null;
}
