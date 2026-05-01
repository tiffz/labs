/**
 * Strips trailing bracket/paren noise common on streaming titles (live tags, clean, etc.)
 * so alternate recordings still fuzzy-match the library entry.
 */
export function normalizeTitleForImportMatch(title: string): string {
  let t = title.trim();
  for (let i = 0; i < 6; i += 1) {
    const next = t
      .replace(/\s*\[[^\]]*?\]\s*$/i, '')
      .replace(/\s*\(\s*live\s*\)\s*$/i, '')
      .replace(/\s*\[[\s,]*live[\s,]*\]\s*$/i, '')
      .trim();
    if (next === t) break;
    t = next;
  }
  return t.trim();
}
