/** Build external search URLs (no scraping). */
export function encoreUltimateGuitarSearchUrl(title: string, artist: string): string {
  const q = `${artist} ${title}`.trim();
  return `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(q)}`;
}

export function encoreGeniusSearchUrl(title: string, artist: string): string {
  const q = `${artist} ${title}`.trim();
  return `https://genius.com/search?q=${encodeURIComponent(q)}`;
}

export function encoreYouTubeSearchUrl(title: string, artist: string): string {
  const q = `${artist} ${title}`.trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
