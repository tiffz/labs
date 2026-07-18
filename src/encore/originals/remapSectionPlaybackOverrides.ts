import {
  parseChordProToChartLayout,
  slugSectionId,
  type SongSection,
} from '../../shared/music/chordPro/chordChartLayout';
import type { SectionPlaybackOverride } from '../../shared/music/resolveSectionPlaybackSettings';

function sectionSlugFromId(sectionId: string): string {
  return sectionId.replace(/-\d+$/, '') || sectionId;
}

/**
 * Re-attach per-section playback overrides after ChordPro re-parse.
 *
 * Overrides are keyed by `SongSection.sectionId` (`${slug}-${index}`). Renaming or reordering
 * sections regenerates those ids and used to leave custom drum patterns orphaned (invisible and
 * unused in playback). Match exact ids first, then reclaim orphans by header slug order.
 */
export function remapSectionPlaybackOverrides(
  sections: readonly SongSection[],
  overrides: Record<string, SectionPlaybackOverride> | undefined,
): Record<string, SectionPlaybackOverride> | undefined {
  if (!overrides || Object.keys(overrides).length === 0) return overrides;

  const sectionIds = new Set(sections.map((section) => section.sectionId));
  const bySlug = new Map<string, string[]>();
  for (const section of sections) {
    const slug = slugSectionId(section.header || section.type);
    const list = bySlug.get(slug) ?? [];
    list.push(section.sectionId);
    bySlug.set(slug, list);
  }

  const next: Record<string, SectionPlaybackOverride> = {};
  const claimedTargets = new Set<string>();

  for (const [key, value] of Object.entries(overrides)) {
    if (!sectionIds.has(key)) continue;
    next[key] = value;
    claimedTargets.add(key);
  }

  const slugCursor = new Map<string, number>();
  for (const [key, value] of Object.entries(overrides)) {
    if (sectionIds.has(key)) continue;
    const slug = sectionSlugFromId(key);
    const candidates = bySlug.get(slug) ?? [];
    const start = slugCursor.get(slug) ?? 0;
    let target: string | undefined;
    for (let i = start; i < candidates.length; i += 1) {
      const candidate = candidates[i]!;
      if (!claimedTargets.has(candidate)) {
        target = candidate;
        slugCursor.set(slug, i + 1);
        break;
      }
    }
    if (!target) {
      // Keep orphaned data so a later chart edit can reclaim it; do not drop silently.
      next[key] = value;
      continue;
    }
    // Prefer existing exact mapping on the target; only fill empty slots.
    if (!next[target]) {
      next[target] = value;
      claimedTargets.add(target);
    } else {
      next[key] = value;
    }
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

export function remapSectionPlaybackOverridesForChordPro(
  lyricsAndChords: string,
  overrides: Record<string, SectionPlaybackOverride> | undefined,
): Record<string, SectionPlaybackOverride> | undefined {
  if (!overrides || Object.keys(overrides).length === 0) return overrides;
  const layout = parseChordProToChartLayout(lyricsAndChords);
  return remapSectionPlaybackOverrides(layout.sections, overrides);
}

export function sectionPlaybackOverridesNeedRemap(
  lyricsAndChords: string,
  overrides: Record<string, SectionPlaybackOverride> | undefined,
): boolean {
  if (!overrides || Object.keys(overrides).length === 0) return false;
  const remapped = remapSectionPlaybackOverridesForChordPro(lyricsAndChords, overrides);
  return JSON.stringify(remapped) !== JSON.stringify(overrides);
}
