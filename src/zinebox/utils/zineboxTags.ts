/** Normalize free-text comic tags: trim, dedupe case-insensitively, max 32 chars each. */
export function normalizeZineboxTags(input: readonly string[] | undefined): string[] {
  if (!input || input.length === 0) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim().slice(0, 32);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export function collectAllZineboxTags(
  comics: ReadonlyArray<{ tags?: readonly string[] }>,
): string[] {
  const map = new Map<string, string>();
  for (const comic of comics) {
    if (!comic.tags) continue;
    for (const t of comic.tags) {
      const trimmed = t.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!map.has(key)) map.set(key, trimmed);
    }
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function comicMatchesTagFilter(comic: { tags?: readonly string[] }, tag: string): boolean {
  const needle = tag.trim().toLowerCase();
  if (!needle) return true;
  return (comic.tags ?? []).some((t) => t.trim().toLowerCase() === needle);
}
