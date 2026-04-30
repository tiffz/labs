/**
 * Best-effort artist / song split for YouTube karaoke and musical-theatre titles.
 * Empty artist means callers may fall back to channelTitle.
 */

const PAREN_METADATA = /^(instrumental|karaoke|official|lyrics|remaster|hd|mv)\s*$/i;

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Normalize smart quotes and em dashes for regex matching. */
export function normalizeYoutubeTitleQuotes(s: string): string {
  return s
    .replace(/\u201c|\u201d|\u201e|\u00ab|\u00bb/g, '"')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u2013|\u2014/g, '-');
}

/** Remove trailing karaoke / accompaniment boilerplate (repeat until stable). */
export function stripKaraokeTrailingPhrases(s: string): string {
  let t = collapseWhitespace(s);
  let prev = '';
  while (prev !== t) {
    prev = t;
    t = t
      .replace(/\s*\(Karaoke Version\s*\[[^\]]*\]\s*\)\s*$/i, '')
      .replace(/\s*\(Karaoke Version\s*\[[^\]]*\]\s*$/i, '')
      .replace(/\s*\(Karaoke Version\)\s*$/i, '')
      .replace(/\s*\[Karaoke Version\]\s*$/i, '')
      .replace(/\s*\(Karaoke\)\s*$/i, '')
      .replace(/\s*\[Karaoke[^\]]*\]\s*$/i, '')
      .replace(/\s*\|\s*Lyrics on Screen\s*$/i, '')
      .replace(/\s*\|\s*Broadway Key[^|]*$/i, '')
      .replace(/\s*\|\s*Piano Accompaniment[^|]*$/i, '')
      .replace(/\s*-\s*Karaoke Track with Lyrics(?: on Screen)?\s*$/i, '')
      .replace(/\s*-\s*Karaoke Track\s*$/i, '')
      .replace(/\s*with Lyrics on Screen\s*$/i, '')
      .replace(/\s*\(karaoke version\)\s*$/i, '')
      .replace(/\s*karaoke piano\s*$/i, '')
      .replace(/\s*karaoke\s*$/i, '')
      .replace(/\s*\(instrumental\)\s*$/i, '')
      .replace(/\s*\[Instrumental\]\s*$/i, '')
      .replace(/\s*\(Official Video\)\s*$/i, '')
      .replace(/\s*\(Official Audio\)\s*$/i, '')
      .replace(/\s*\(Official Music Video\)\s*$/i, '')
      .replace(/\s*\(Lyrics\)\s*$/i, '')
      .replace(/\s*\[Lyrics\]\s*$/i, '')
      .replace(/\s*\(Lyric Video\)\s*$/i, '')
      .replace(/\s*-\s*KaraFun\s*$/i, '')
      .replace(/\s*-\s*Karaoke Version\s*$/i, '');
    t = collapseWhitespace(t);
  }
  return t;
}

/** Keep only the segment before the first single `|` (not part of `||`). */
function stripPipeTail(s: string): string {
  let scan = 0;
  while (scan < s.length) {
    const i = s.indexOf('|', scan);
    if (i < 0) return s;
    if (s[i + 1] === '|') {
      scan = i + 2;
      continue;
    }
    return collapseWhitespace(s.slice(0, i));
  }
  return s;
}

function preprocessYoutubeTitle(raw: string): string {
  const s0 = collapseWhitespace(normalizeYoutubeTitleQuotes(raw));
  if (!s0) return '';
  const bracket = s0.match(/^\[[^\]]{1,200}\]\s*(.+)$/);
  const s1 = bracket?.[1] ? collapseWhitespace(bracket[1]) : s0;
  return stripPipeTail(s1);
}

function tryDoublePipe(s: string): { artist: string; songTitle: string } | null {
  if (!s.includes('||')) return null;
  const parts = s.split('||').map((p) => collapseWhitespace(p));
  const left = parts[0] ?? '';
  const right = parts.slice(1).join('||').trim();
  if (!right) return null;
  return {
    artist: stripKaraokeTrailingPhrases(right),
    songTitle: stripKaraokeTrailingPhrases(left || right),
  };
}

/** "Song" from The Phantom of the Opera - Karaoke Track ... */
function tryQuotedFromWork(s: string): { artist: string; songTitle: string } | null {
  const m = s.match(/^["'](.+?)["']\s+from\s+(.+)$/i);
  if (!m?.[1] || !m[2]) return null;
  const song = stripKaraokeTrailingPhrases(m[1]);
  const work = stripKaraokeTrailingPhrases(m[2].replace(/\s*-\s*Karaoke.*$/i, '').trim());
  if (!song) return null;
  return { artist: work, songTitle: song };
}

/** "Heart" (Karaoke) – Six: The Musical | Lyrics ... */
function tryQuotedKaraokeDashWork(s: string): { artist: string; songTitle: string } | null {
  const m = s.match(/^["'](.+?)["']\s*\(\s*Karaoke\s*\)\s*[-–—]\s*(.+)$/i);
  if (!m?.[1] || !m[2]) return null;
  const song = stripKaraokeTrailingPhrases(m[1]);
  const work = stripKaraokeTrailingPhrases(stripPipeTail(m[2]));
  if (!song) return null;
  return { artist: work, songTitle: song };
}

/** "Days and Days" - Fun Home [Karaoke/Instrumental w/ Lyrics] */
function tryQuotedDashWork(s: string): { artist: string; songTitle: string } | null {
  const m = s.match(/^["'](.+?)["']\s*[-–—]\s*(.+)$/);
  if (!m?.[1] || !m[2]) return null;
  const song = stripKaraokeTrailingPhrases(m[1]);
  let work = m[2].replace(/\s*\[Karaoke[^\]]*\]\s*$/i, '').trim();
  work = stripKaraokeTrailingPhrases(work);
  if (!song) return null;
  return { artist: work, songTitle: song };
}

/** Don't Cry for Me Argentina / Karaoke / Lloyd Webber / ... */
function trySlashKaraokeSegments(s: string): { artist: string; songTitle: string } | null {
  if (!/\/\s*Karaoke\s*\//i.test(s)) return null;
  const segments = s.split('/').map((x) => collapseWhitespace(x));
  const song = stripKaraokeTrailingPhrases(segments[0] ?? '');
  const composerSeg = segments.find((p, i) => i > 0 && /Webber|Sondheim|Lloyd|Rodgers|Porter/i.test(p));
  return {
    artist: composerSeg ? stripKaraokeTrailingPhrases(composerSeg) : '',
    songTitle: song || stripKaraokeTrailingPhrases(s),
  };
}

/**
 * Artist - Title when title side looks like karaoke upload OR left looks like multi-artist list.
 */
function tryDashArtistThenTitle(s: string): { artist: string; songTitle: string } | null {
  const m = s.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (!m?.[1] || !m[2]) return null;
  const left = collapseWhitespace(m[1]);
  const right = collapseWhitespace(m[2]);
  const rightLooksKaraoke =
    /\(?\s*Karaoke|Karaoke Version|\[\s*Karaoke|From The Movie|From the movie|A Star Is Born|\(From\b/i.test(
      right,
    );
  const rightLooksOfficialUpload =
    /\(Official Video\)|\(Lyrics\)|Lyrics Video|Official Audio|\(Official Audio\)|\bFull Album\b/i.test(right);
  const leftLooksCommaArtists = /,/.test(left) && !/\|/.test(left);
  if (!rightLooksKaraoke && !rightLooksOfficialUpload && !leftLooksCommaArtists) return null;
  return {
    artist: left,
    songTitle: stripKaraokeTrailingPhrases(right),
  };
}

/** Title (Short work name) e.g. She Used To Be Mine (Waitress) — not (instrumental). */
function tryParenWorkSuffix(s: string): { artist: string; songTitle: string } | null {
  const m = s.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (!m?.[1] || !m[2]) return null;
  const inner = collapseWhitespace(m[2]);
  if (inner.length < 2 || inner.length > 42) return null;
  if (PAREN_METADATA.test(inner)) return null;
  return {
    artist: inner,
    songTitle: stripKaraokeTrailingPhrases(m[1]),
  };
}

function tryGenericDashOrPipe(s: string): { artist: string; songTitle: string } | null {
  const m = s.match(/^(.+?)\s+[-–—|]\s+(.+)$/);
  if (!m?.[1] || !m[2]) return null;
  return {
    artist: stripKaraokeTrailingPhrases(m[1]),
    songTitle: stripKaraokeTrailingPhrases(m[2]),
  };
}

/**
 * Parse YouTube video title into display artist + song title for import.
 * Artist may be empty; use channelTitle as fallback when saving EncoreSong.
 */
export function parseYoutubeTitleForSong(raw: string): { artist: string; songTitle: string } {
  const s0 = collapseWhitespace(normalizeYoutubeTitleQuotes(raw));
  if (!s0) return { artist: '', songTitle: 'Untitled' };
  const s2 = preprocessYoutubeTitle(raw);
  return parseYoutubeTitleFromPreprocessed(s2);
}

/**
 * True when the title yielded no artist and the song title is effectively the raw title
 * (so an optional description line may help).
 */
export function isLowConfidenceYoutubeTitleParse(
  parsed: { artist: string; songTitle: string },
  raw: string,
): boolean {
  if (parsed.artist) return false;
  const baseline = stripKaraokeTrailingPhrases(preprocessYoutubeTitle(raw));
  const song = collapseWhitespace(parsed.songTitle);
  return song === baseline || (song === 'Untitled' && !baseline);
}

/**
 * First non-empty description line matching `Artist - Title` (conservative).
 */
export function tryParseYoutubeDescriptionFirstLine(description: string): { artist: string; songTitle: string } | null {
  const lines = description.split(/\r?\n/).map((l) => collapseWhitespace(l));
  const first = lines.find((l) => {
    if (!l || l.length > 200) return false;
    if (/^https?:\/\//i.test(l)) return false;
    if (/^#[\w]+(\s+#\w+)*$/i.test(l)) return false;
    return true;
  });
  if (!first) return null;

  const m = first.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (!m?.[1] || !m[2]) return null;
  const artist = stripKaraokeTrailingPhrases(m[1]);
  const songTitle = stripKaraokeTrailingPhrases(m[2]);
  if (artist.length < 2 || songTitle.length < 2) return null;
  if (artist.length > 80 || songTitle.length > 120) return null;
  return { artist, songTitle };
}

export function parseYoutubeTitleForSongWithContext(
  raw: string,
  options?: { description?: string },
): { artist: string; songTitle: string } {
  const base = parseYoutubeTitleForSong(raw);
  const desc = options?.description?.trim();
  if (!desc) return base;
  if (!isLowConfidenceYoutubeTitleParse(base, raw)) return base;
  const hint = tryParseYoutubeDescriptionFirstLine(desc);
  if (!hint?.artist || !hint.songTitle) return base;
  return { artist: hint.artist, songTitle: hint.songTitle };
}

function parseYoutubeTitleFromPreprocessed(s2: string): { artist: string; songTitle: string } {
  const pipeline: Array<() => { artist: string; songTitle: string } | null> = [
    () => tryDoublePipe(s2),
    () => tryQuotedFromWork(s2),
    () => tryQuotedKaraokeDashWork(s2),
    () => tryQuotedDashWork(s2),
    () => trySlashKaraokeSegments(s2),
    () => tryDashArtistThenTitle(s2),
    () => tryParenWorkSuffix(s2),
    () => tryGenericDashOrPipe(s2),
  ];

  for (const fn of pipeline) {
    const hit = fn();
    if (hit && (hit.songTitle || hit.artist)) {
      const songTitle = stripKaraokeTrailingPhrases(hit.songTitle) || stripKaraokeTrailingPhrases(s2) || 'Untitled';
      const artist = stripKaraokeTrailingPhrases(hit.artist);
      return { artist, songTitle };
    }
  }

  return {
    artist: '',
    songTitle: stripKaraokeTrailingPhrases(s2) || 'Untitled',
  };
}
