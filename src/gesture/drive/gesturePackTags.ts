import type { GesturePack } from '../types';

/** Normalized tag for nude/adult reference collections. Previews blur by default (device-local preference). */
export const GESTURE_NSFW_TAG = 'nsfw';

/** Tooltip for the nsfw tag chip and autocomplete hint. */
export const GESTURE_NSFW_TAG_TOOLTIP =
  'Marks nude or adult reference photos. Previews blur on this device until you turn on Show NSFW. The tag syncs with Drive; blur stays on this device only.';

/** Normalize free-form collection tags for storage and matching (lowercase, trimmed, collapsed spaces). */
export function normalizeGestureTag(raw: string): string | null {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return null;
  if (normalized.length > 48) return normalized.slice(0, 48);
  return normalized;
}

/** Deduped normalized tags in display order (nsfw first when present, then A–Z). */
export function normalizeGestureTags(tags: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of tags) {
    const tag = normalizeGestureTag(raw);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return sortGestureTagsForDisplay(out);
}

/** Alphabetical tag order; `nsfw` first when present (special visibility tag). */
export function sortGestureTagsForDisplay(tags: readonly string[]): string[] {
  const hasNsfw = tags.some((tag) => normalizeGestureTag(tag) === GESTURE_NSFW_TAG);
  const rest = tags
    .filter((tag) => normalizeGestureTag(tag) !== GESTURE_NSFW_TAG)
    .slice()
    .sort((a, b) => a.localeCompare(b));
  return hasNsfw ? [GESTURE_NSFW_TAG, ...rest] : rest;
}

export function collectGestureTagsFromPacks(packs: readonly GesturePack[]): string[] {
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
  return sortGestureTagsForDisplay(out);
}

/** How many collections carry each normalized tag. */
export function countGestureCollectionsPerTag(packs: readonly GesturePack[]): Map<string, number> {
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

export function packHasNsfwTag(pack: GesturePack): boolean {
  return packHasGestureTag(pack, GESTURE_NSFW_TAG);
}

export function isGestureNsfwTag(tag: string): boolean {
  return normalizeGestureTag(tag) === GESTURE_NSFW_TAG;
}

/** When false, NSFW-tagged collections are excluded from practice selection (previews may still blur in grids). */
export function packPassesNsfwVisibility(pack: GesturePack, showNsfwCollections: boolean): boolean {
  if (showNsfwCollections) return true;
  return !packHasNsfwTag(pack);
}

/** Blur collection preview photos on this device when NSFW is tagged and Show NSFW is off. */
export function packShouldBlurNsfwPreviews(pack: GesturePack, showNsfwCollections: boolean): boolean {
  return !showNsfwCollections && packHasNsfwTag(pack);
}

export function countNsfwTaggedCollections(packs: readonly GesturePack[]): number {
  return packs.filter((pack) => packHasNsfwTag(pack)).length;
}

/** Tag filter chips exclude NSFW — visibility uses a separate device-local toggle. */
export function collectGestureTagsForFilterBar(packs: readonly GesturePack[]): string[] {
  return collectGestureTagsFromPacks(packs).filter((tag) => tag !== GESTURE_NSFW_TAG);
}

export function countGestureCollectionsPerTagForFilterBar(
  packs: readonly GesturePack[],
): Map<string, number> {
  const counts = countGestureCollectionsPerTag(packs);
  counts.delete(GESTURE_NSFW_TAG);
  return counts;
}

/** Tag autocomplete options — always surfaces `nsfw` for discoverability. */
export function collectGestureTagAutocompleteOptions(
  allTags: readonly string[],
  localTags: readonly string[],
): string[] {
  const chosen = new Set(
    localTags
      .map((tag) => normalizeGestureTag(tag))
      .filter((tag): tag is string => tag != null),
  );
  const options = allTags.filter((tag) => !chosen.has(tag.toLowerCase()));
  if (chosen.has(GESTURE_NSFW_TAG)) return sortGestureTagsForDisplay(options);
  const withNsfw = options.includes(GESTURE_NSFW_TAG)
    ? options
    : [GESTURE_NSFW_TAG, ...options.filter((tag) => tag !== GESTURE_NSFW_TAG)];
  return sortGestureTagsForDisplay(withNsfw);
}
