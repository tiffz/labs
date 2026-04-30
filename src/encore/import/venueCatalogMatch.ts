/**
 * Pick the best venue string from the user catalog using folder path and file name.
 * Heuristic: token overlap after normalization; prefers longer catalog matches.
 */

function normalizeVenueToken(s: string): string {
  return s
    .toLowerCase()
    .replace(/[''`]/g, '')
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
  const parts = [opts.fileName, opts.parentPathHint ?? ''].filter(Boolean);
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
  return bestScore >= 10 ? best : '';
}
