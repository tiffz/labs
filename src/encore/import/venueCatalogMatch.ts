/**
 * Pick the best venue string from the user catalog using folder path and file name.
 * Heuristic: token overlap after normalization; prefers longer catalog matches.
 */

/** Strip extension and leading date-like prefixes so `2026-05-03-Blue Note.mp4` still matches catalog. */
export function stripLeadingDateNoiseFromFileName(fileName: string): string {
  let s = fileName.replace(/\.[^./\\]+$/i, '').trim();
  for (let i = 0; i < 4; i++) {
    const next = s
      .replace(/^\d{4}-\d{2}-\d{2}[_\s-]*/i, '')
      .replace(/^\d{4}\d{2}\d{2}[_\s-]*/i, '')
      .replace(/^\d{1,2}-\d{1,2}-\d{4}[_\s-]*/i, '');
    if (next === s) break;
    s = next.trim();
  }
  return s;
}

/**
 * Strip the trailing macOS/Chrome duplicate-download suffix (` (1)`, ` (2)`, …) from a file
 * stem. Without this, `"12 (1).mp4"` slips through {@link fallbackVenueFromFileName} as the
 * literal venue `"(1)"` once the digits-only token `"12"` is rejected.
 *
 * Conservative on purpose: only strips a single trailing `(N)` group with 1–3 digits, which is
 * what the OS-level rename pattern produces. A real venue with parentheses like
 * `"Bar (Upstairs)"` is left intact because the inner text is non-numeric.
 */
export function stripTrailingDuplicateSuffix(stem: string): string {
  return stem.replace(/\s*\(\d{1,3}\)\s*$/u, '').trim();
}

const FALLBACK_VENUE_STOPWORDS = new Set(
  [
    'recording',
    'video',
    'clip',
    'final',
    'export',
    'mix',
    'iphone',
    'gopro',
    'img',
    'mov',
    'take',
    'audio',
    'master',
    'edit',
    'edited',
  ].map((w) => w.toLowerCase()),
);

/** Number of ASCII letters in `s` (used to filter out punctuation-only and digit-heavy tokens). */
function letterCount(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) n += 1;
  }
  return n;
}

/**
 * When the catalog does not match, derive a short venue-ish token from the file stem (for
 * free-solo Autocomplete). Conservative by design — we'd rather leave the field blank than
 * stuff in a meaningless token like `"(1)"` (the trailing OS duplicate suffix on `"12 (1).mp4"`)
 * or `"IMG"` (camera prefix) and force the user to clear it.
 */
export function fallbackVenueFromFileName(fileName: string): string {
  const stem = stripTrailingDuplicateSuffix(stripLeadingDateNoiseFromFileName(fileName));
  if (!stem) return '';
  const segments = stem
    .split(/[-_\s]+/)
    .map((s) => s.trim())
    // Require at least 3 actual letters: rejects digit-only chunks ("12"), parenthetical
    // residue ("(1)"), and short camera/device prefixes — anything left looks word-like
    // enough to plausibly be a venue.
    .filter((s) => letterCount(s) >= 3);
  // If every word in the filename is a known camera/export stopword (`IMG`, `MOV`, `take`,
  // `final`, …), the filename has nothing meaningful to say about the venue. Returning empty
  // here is preferable to titlecasing `IMG` and forcing the user to clear it.
  const scored = segments.filter((s) => !FALLBACK_VENUE_STOPWORDS.has(s.toLowerCase()));
  if (scored.length === 0) return '';
  const best = [...scored].sort((a, b) => b.length - a.length)[0];
  if (!best) return '';
  return best.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Prefer {@link bestVenueFromCatalog}; if none, use {@link fallbackVenueFromFileName} so new users still see a guess.
 */
export function suggestPerformanceVenueFromFile(catalog: readonly string[], fileName: string): string {
  const fromCat = bestVenueFromCatalog(catalog, { fileName }).trim();
  if (fromCat) return fromCat;
  return fallbackVenueFromFileName(fileName).trim();
}

function normalizeVenueToken(s: string): string {
  return s
    .toLowerCase()
    .replace(/['`\u2019]/g, '')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(s: string): Set<string> {
  const n = normalizeVenueToken(s);
  if (!n) return new Set();
  return new Set(n.split(' ').filter((t) => t.length > 1));
}

function scoreCatalogEntry(haystackNorm: string, catalogVenue: string): number {
  const catNorm = normalizeVenueToken(catalogVenue);
  if (!catNorm) return 0;
  if (haystackNorm.includes(catNorm)) return 80 + catNorm.length;
  if (catNorm.length >= 4 && haystackNorm.includes(catNorm.slice(0, Math.min(catNorm.length, 12)))) return 40 + catNorm.length;
  const hayTokens = tokenSet(haystackNorm);
  const catTokens = tokenSet(catalogVenue);
  if (hayTokens.size === 0 || catTokens.size === 0) return 0;
  let overlap = 0;
  for (const t of catTokens) {
    if (hayTokens.has(t)) overlap += t.length;
  }
  return overlap > 0 ? 10 + overlap : 0;
}

export function bestVenueFromCatalog(
  catalog: readonly string[],
  opts: { fileName: string; parentPathHint?: string },
): string {
  const strippedStem = stripLeadingDateNoiseFromFileName(opts.fileName);
  const parts = [strippedStem, opts.parentPathHint ?? ''].filter(Boolean);
  const haystackNorm = normalizeVenueToken(parts.join(' '));
  if (!haystackNorm) return '';

  let best = '';
  let bestScore = 0;
  for (const v of catalog) {
    const trimmed = v.trim();
    if (!trimmed) continue;
    const sc = scoreCatalogEntry(haystackNorm, trimmed);
    if (sc > bestScore || (sc === bestScore && trimmed.length > best.length)) {
      bestScore = sc;
      best = trimmed;
    }
  }
  return bestScore >= 8 ? best : '';
}
