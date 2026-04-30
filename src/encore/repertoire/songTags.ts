import type { EncoreSong } from '../types';

/**
 * Normalize a list of free-text song tags:
 *  - trim whitespace
 *  - drop empty strings
 *  - dedupe case-insensitively, preserving the first-seen casing
 *  - cap individual tag length to 32 chars to keep the UI tidy
 */
export function normalizeSongTags(input: readonly string[] | undefined): string[] {
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

/** Collect every unique tag across the user's library, sorted alphabetically. */
export function collectAllSongTags(songs: readonly EncoreSong[]): string[] {
  const map = new Map<string, string>();
  for (const s of songs) {
    if (!s.tags) continue;
    for (const t of s.tags) {
      const trimmed = t.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!map.has(key)) map.set(key, trimmed);
    }
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}
