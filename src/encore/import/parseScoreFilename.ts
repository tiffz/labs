/**
 * Parse a score filename (PDF / MusicXML / MIDI) into structured metadata for
 * bulk-import auto-pairing.
 *
 * Supported conventions (in priority order):
 *   1. MusicNotes exports
 *      "<Title> - <Key> [Major|Minor] - MN<id>[_U<n>].<ext>"
 *      "<Title> - <Artist> - <Key> [Major|Minor] - MN<id>.<ext>"
 *   2. Tunescribers exports (underscore-heavy)
 *      "<Title>_from_<Show>_Arr._Tunescribers_-_<Composer>(_<Voicing>).<ext>"
 *   3. Generic descriptor suffixes:
 *      "<Title> - sheet music.<ext>", "<Title> - Lead Sheet.<ext>",
 *      "<Title> - Piano Vocal.<ext>", "<Title> with Lyrics and Chords.<ext>",
 *      "<Title> (PVG).<ext>", etc.
 *   4. Show / source after a dash:
 *      "<Title> - <Source>.<ext>"  (Source surfaced as `sourceShow`)
 *   5. Bare title:
 *      "<Title>.<ext>"
 *
 * Test coverage lives in `parseScoreFilename.test.ts` and the golden table
 * `scoreFilenameFixtures.ts`.
 */

const SCORE_EXTENSION_RE = /\.(pdf|musicxml|mxl|mid|midi|xml)$/i;

const TRAILING_DESCRIPTORS: ReadonlyArray<RegExp> = [
  /\s*[-–—]\s*sheet\s*music\s*$/i,
  /\s*[-–—]\s*lead\s*sheet\s*$/i,
  /\s*[-–—]\s*piano\s*\/?\s*vocal(?:\s*\/?\s*guitar)?\s*$/i,
  /\s*[-–—]\s*piano\s*solo\s*$/i,
  /\s*[-–—]\s*piano\s*accompaniment\s*$/i,
  /\s*[-–—]\s*pvg\s*$/i,
  /\s*\(\s*pvg\s*\)\s*$/i,
  /\s*\(\s*piano\s*vocal(?:\s*guitar)?\s*\)\s*$/i,
  /\s*\(\s*piano\s*solo\s*\)\s*$/i,
  /\s*\(\s*lead\s*sheet\s*\)\s*$/i,
  /\s*with\s+lyrics\s+and\s+chords\s*$/i,
  /\s*with\s+lyrics\s*$/i,
];

const KEY_ROOT_TO_CANONICAL: Record<string, string> = {
  c: 'C',
  'c#': 'C#',
  cs: 'C#',
  db: 'Db',
  d: 'D',
  'd#': 'D#',
  ds: 'D#',
  eb: 'Eb',
  e: 'E',
  f: 'F',
  'f#': 'F#',
  fs: 'F#',
  gb: 'Gb',
  g: 'G',
  'g#': 'G#',
  gs: 'G#',
  ab: 'Ab',
  a: 'A',
  'a#': 'A#',
  as: 'A#',
  bb: 'Bb',
  b: 'B',
};

const KEY_CHUNK_RE = /^([A-G])\s*([#b♯♭]?)\s*(major|minor|maj|min)$/i;

export interface ParsedScoreFilename {
  /** Cleaned, human-readable title. */
  title: string;
  /** Artist if the filename clearly carried one (e.g. MusicNotes 4-segment variant). */
  artist?: string;
  /** Canonical key like `Db major` matching ENCORE_PERFORMANCE_KEY_OPTIONS. */
  key?: string;
  /** Show / source name pulled from `from <Show>` or trailing dash for theatre exports. */
  sourceShow?: string;
  /** Original input minus extension; useful for debugging and search blobs. */
  base: string;
  /** Original input verbatim (with extension). */
  raw: string;
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function stripExtension(name: string): string {
  return name.replace(SCORE_EXTENSION_RE, '');
}

function unscoreUnderscores(s: string): string {
  /* MusicNotes filenames legitimately use spaces; Tunescribers uses underscores
     pervasively. We only convert underscores to spaces when there are NO spaces
     anywhere, so that "Title_from_Show_Arr." style files normalize cleanly
     without disturbing the natural MusicNotes pattern. */
  if (/\s/.test(s)) return s;
  return s.replace(/_/g, ' ');
}

function stripTrailingDescriptors(s: string): string {
  let prev = '';
  let cur = s;
  while (prev !== cur) {
    prev = cur;
    for (const re of TRAILING_DESCRIPTORS) {
      cur = cur.replace(re, '');
    }
    cur = collapseWhitespace(cur);
  }
  return cur;
}

function normalizeKey(rootRaw: string, accidental: string, modeRaw: string): string | undefined {
  const root = `${rootRaw.toLowerCase()}${accidental.replace('♯', '#').replace('♭', 'b')}`;
  const canonical = KEY_ROOT_TO_CANONICAL[root];
  if (!canonical) return undefined;
  const mode = modeRaw.toLowerCase().startsWith('maj') ? 'major' : 'minor';
  return `${canonical} ${mode}`;
}

function tryMusicNotes(base: string): ParsedScoreFilename | null {
  /* Match "...- MN<digits>(_U<digits>)?$" where MN suffix is the canonical
     MusicNotes signature. */
  const m = base.match(/^(.*?)\s*[-–—]\s*MN\d+(?:_U\d+)?\s*$/i);
  if (!m?.[1]) return null;
  const head = collapseWhitespace(m[1]);
  if (!head) return null;

  /* Split head on dashes and look for the LAST segment that is a key,
     so "Title - Artist - Key - MN<id>" works as well as "Title - Key - MN<id>". */
  const segments = head.split(/\s*[-–—]\s*/g).map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return null;

  let keySegmentIndex = -1;
  let key: string | undefined;
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const seg = segments[i]!;
    const km = seg.match(KEY_CHUNK_RE);
    if (km) {
      const norm = normalizeKey(km[1]!, km[2] ?? '', km[3]!);
      if (norm) {
        key = norm;
        keySegmentIndex = i;
        break;
      }
    }
  }

  if (keySegmentIndex < 0) {
    /* No key segment but a trailing MN-id is still a strong signal — return
       the full head as the title. */
    return { title: head, base, raw: '' };
  }

  const titleSegments = segments.slice(0, keySegmentIndex);
  const artistCandidate =
    titleSegments.length >= 2 ? collapseWhitespace(titleSegments[titleSegments.length - 1]!) : '';
  const titlePart = (titleSegments.length >= 2 ? titleSegments.slice(0, -1) : titleSegments)
    .join(' - ')
    .trim();

  return {
    title: collapseWhitespace(titlePart),
    artist: artistCandidate || undefined,
    key,
    base,
    raw: '',
  };
}

function tryTunescribers(base: string): ParsedScoreFilename | null {
  if (!/Tunescribers/i.test(base) && !/_Arr\._/i.test(base)) return null;
  /* Underscores into spaces for parsing (Tunescribers uses _ as the only delimiter). */
  const normalized = collapseWhitespace(base.replace(/_/g, ' '));
  /* Pull "from <Show> Arr." section. */
  const showMatch = normalized.match(/\bfrom\s+(.+?)\s+Arr\.\s*Tunescribers\b/i);
  const arrIdx = normalized.search(/\bArr\.\s*Tunescribers\b/i);
  const titlePart = showMatch ? normalized.slice(0, normalized.search(/\bfrom\b/i)).trim() : normalized.split(/\bArr\./i)[0]?.trim() ?? normalized;

  let composer: string | undefined;
  if (arrIdx >= 0) {
    const tail = normalized.slice(arrIdx).replace(/^Arr\.\s*Tunescribers\s*-\s*/i, '');
    /* Drop trailing voicing words like "Piano Vocal", "PVG", "Lead Sheet". */
    const composerRaw = tail
      .replace(/\s*Piano\s*Vocal(?:\s*Guitar)?\s*$/i, '')
      .replace(/\s*Piano\s*Solo\s*$/i, '')
      .replace(/\s*Lead\s*Sheet\s*$/i, '')
      .replace(/\s*PVG\s*$/i, '')
      .trim();
    if (composerRaw) {
      /* Tunescribers chains co-composers as "First Last First2 Last2" — without
         a delimiter we cannot reliably split, so we attempt a heuristic that
         pairs every two tokens when token count is even, otherwise returns the
         whole string. This is best-effort and the user can edit on import review. */
      composer = pairTokensIntoNames(composerRaw);
    }
  }

  return {
    title: collapseWhitespace(titlePart) || normalized,
    artist: composer,
    sourceShow: showMatch?.[1]?.trim(),
    base,
    raw: '',
  };
}

function pairTokensIntoNames(s: string): string {
  const tokens = s.split(/\s+/).filter(Boolean);
  /* Pair every 2 tokens when even and length >= 4 (suggests at least two names). */
  if (tokens.length >= 4 && tokens.length % 2 === 0) {
    const pairs: string[] = [];
    for (let i = 0; i < tokens.length; i += 2) {
      pairs.push(`${tokens[i]} ${tokens[i + 1]}`);
    }
    return pairs.join(', ');
  }
  /* Pair every 3 tokens when divisible by 3 and length >= 6 (e.g. "Jack Murphy" + "Frank N Wildhorn"). */
  if (tokens.length >= 5 && tokens.length <= 8 && tokens.length % 2 !== 0) {
    /* Heuristic: split mid-string. The user can re-edit on import. */
    const mid = Math.ceil(tokens.length / 2);
    return `${tokens.slice(0, mid).join(' ')}, ${tokens.slice(mid).join(' ')}`;
  }
  return s;
}

function tryDashSourceSuffix(base: string): ParsedScoreFilename | null {
  /* "<Title> - <Source>" where the source side does NOT look like a key
     and does NOT look like a MusicNotes id. This catches musical-theatre
     attributions like "Someone Like You - Jekyll & Hyde". */
  const segments = base.split(/\s*[-–—]\s*/g).map((s) => s.trim()).filter(Boolean);
  if (segments.length < 2) return null;
  const last = segments[segments.length - 1]!;
  if (KEY_CHUNK_RE.test(last)) return null;
  if (/^MN\d+/i.test(last)) return null;
  /* Generic suffixes ("sheet music", "lead sheet" etc.) are handled earlier. */
  if (/^(sheet music|lead sheet|piano (vocal|solo|accompaniment)|pvg)$/i.test(last)) return null;
  return {
    title: collapseWhitespace(segments.slice(0, -1).join(' - ')),
    sourceShow: last,
    base,
    raw: '',
  };
}

/** Parse a single filename. Always returns a ParsedScoreFilename (never throws). */
export function parseScoreFilename(rawFileName: string): ParsedScoreFilename {
  const raw = rawFileName.trim();
  if (!raw) {
    return { title: 'Untitled', base: '', raw: rawFileName };
  }
  const noExt = stripExtension(raw);
  const baseUnscored = unscoreUnderscores(collapseWhitespace(noExt));
  const baseStripped = stripTrailingDescriptors(baseUnscored);

  /* MusicNotes is a strong signal — try first. */
  const mn = tryMusicNotes(baseStripped);
  if (mn) return { ...mn, base: baseStripped, raw };

  /* Tunescribers next. */
  const ts = tryTunescribers(noExt);
  if (ts) return { ...ts, base: baseStripped, raw };

  /* Plain "<Title> - <Source>" attribution. */
  const ds = tryDashSourceSuffix(baseStripped);
  if (ds) return { ...ds, base: baseStripped, raw };

  /* Fallback: bare title (descriptors already stripped). */
  return { title: baseStripped || raw, base: baseStripped, raw };
}
