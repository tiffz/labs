/** Extract Spotify track id from paste (URL, URI, or bare 22-char id). */
export function parseSpotifyTrackId(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const fromWeb = s.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([A-Za-z0-9]+)/);
  if (fromWeb?.[1]) return fromWeb[1];
  const fromUri = s.match(/spotify:track:([A-Za-z0-9]+)/);
  if (fromUri?.[1]) return fromUri[1];
  if (/^[A-Za-z0-9]{22}$/.test(s)) return s;
  return null;
}
