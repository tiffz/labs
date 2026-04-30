const MAX_CANDIDATES = 36;

function norm(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function stripExtension(fileName: string): string {
  const t = fileName.trim();
  if (!t) return '';
  return t.replace(/\.[^./\\]+$/i, '').trim() || t;
}

/**
 * Splits the basename on common delimiters and returns deduped fragments for fuzzy matching.
 * Examples: `Let It Go - Martuni's` → `Let It Go`, `Martuni's`, short joins.
 */
export function buildBulkVideoFilenameCandidates(fileName: string): readonly string[] {
  const base = norm(stripExtension(fileName));
  if (!base) return [];
  const order: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string) => {
    const t = norm(raw);
    if (t.length < 2) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    order.push(t);
  };

  add(base);

  const parts = base
    .split(/[-_–—|[\]()]+/g)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);

  for (const p of parts) add(p);

  for (let i = 0; i < parts.length; i += 1) {
    if (i + 1 < parts.length) {
      add(`${parts[i]} ${parts[i + 1]}`);
    }
    if (i + 2 < parts.length) {
      add(`${parts[i]} ${parts[i + 1]} ${parts[i + 2]}`);
    }
  }

  return order.slice(0, MAX_CANDIDATES);
}
