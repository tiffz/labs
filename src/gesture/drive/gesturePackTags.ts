import type { GesturePack } from '../types';

/** Normalize free-form collection tags for storage and matching (lowercase, trimmed, collapsed spaces). */
export function normalizeGestureTag(raw: string): string | null {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return null;
  if (normalized.length > 48) return normalized.slice(0, 48);
  return normalized;
}

/** Deduped normalized tags in stable order. */
export function normalizeGestureTags(tags: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of tags) {
    const tag = normalizeGestureTag(raw);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

export function collectGestureTagsFromPacks(packs: GesturePack[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const pack of packs) {
    for (const raw of pack.tags ?? []) {
      const tag = normalizeGestureTag(raw);
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      out.push(tag);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

/** How many collections carry each normalized tag. */
export function countGestureCollectionsPerTag(packs: GesturePack[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const pack of packs) {
    for (const tag of normalizeGestureTags(pack.tags ?? [])) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return counts;
}

/** OR semantics: empty filters → all packs; otherwise any listed tag on the pack matches. */
export function packMatchesGestureTagFilters(pack: GesturePack, activeTags: string[]): boolean {
  if (activeTags.length === 0) return true;
  const packTags = new Set(normalizeGestureTags(pack.tags ?? []));
  return activeTags.some((tag) => packTags.has(tag));
}

export function packHasGestureTag(pack: GesturePack, tag: string): boolean {
  const normalized = normalizeGestureTag(tag);
  if (!normalized) return false;
  return normalizeGestureTags(pack.tags ?? []).includes(normalized);
}
