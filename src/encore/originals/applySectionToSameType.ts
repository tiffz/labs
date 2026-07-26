import {
  matchWriteLinesToPrevious,
  snapChordColumnToCharIndex,
  type ChartLayout,
  type SectionType,
} from '../../shared/music/chordPro/chordChartLayout';
import type { OriginalsSectionPlaybackOverride } from './sectionPlaybackOverrides';

/**
 * 'Other' collapses every non-standard header (Pre-Chorus, Interlude, Solo, custom
 * names) into one bucket, so two 'Other' sections are almost never the "same" section.
 * Grouping them would overwrite unrelated content, so apply-to-all skips 'Other'.
 */
function isGroupableType(type: SectionType): boolean {
  return type !== 'Other';
}

/** Lowercase plural noun for a section type, for "Replace chords in all {plural}" copy. */
export function sectionTypePlural(type: SectionType): string {
  switch (type) {
    case 'Verse':
      return 'verses';
    case 'Chorus':
      return 'choruses';
    case 'Bridge':
      return 'bridges';
    case 'Intro':
      return 'intros';
    case 'Outro':
      return 'outros';
    default:
      return 'sections';
  }
}

/** Lowercase singular noun for a section type. */
export function sectionTypeSingular(type: SectionType): string {
  return type === 'Other' ? 'section' : type.toLowerCase();
}

/** "2 choruses" / "1 verse" — count plus the matching noun. */
export function sectionCountLabel(type: SectionType, count: number): string {
  return `${count} ${count === 1 ? sectionTypeSingular(type) : sectionTypePlural(type)}`;
}

/**
 * Count sections that share the given section's type (including itself).
 * Returns 0 for an unknown id or the ambiguous 'Other' type.
 */
export function countSameTypeSections(layout: ChartLayout, sectionId: string): number {
  const source = layout.sections.find((section) => section.sectionId === sectionId);
  if (!source || !isGroupableType(source.type)) return 0;
  return layout.sections.filter((section) => section.type === source.type).length;
}

/** True when the apply-to-all actions are worth offering (more than one groupable same-type section). */
export function canApplySectionToSameType(layout: ChartLayout, sectionId: string): boolean {
  return countSameTypeSections(layout, sectionId) > 1;
}

/**
 * Copy the source section's chords onto every other same-type section.
 * Lines are matched by lyric similarity (not raw index), so a sibling with a
 * different line count or a leading blank line still lands chords on the right
 * lyric. A target line with no matching source line is cleared, so each sibling
 * mirrors the source rather than keeping stale chords.
 */
export function applySectionChordsToSameType(
  layout: ChartLayout,
  sourceSectionId: string,
): ChartLayout {
  const source = layout.sections.find((section) => section.sectionId === sourceSectionId);
  if (!source || !isGroupableType(source.type)) return layout;

  return {
    sections: layout.sections.map((section) => {
      if (section.sectionId === sourceSectionId || section.type !== source.type) {
        return section;
      }
      const paired = matchWriteLinesToPrevious(
        source.lines,
        section.lines.map((line) => line.text),
      );
      return {
        ...section,
        lines: section.lines.map((line, lineIndex) => {
          const sourceLine = paired[lineIndex]?.prevLine ?? null;
          const chords = sourceLine
            ? sourceLine.chords.map((chord) => ({
                id: crypto.randomUUID(),
                chordName: chord.chordName,
                charIndex: snapChordColumnToCharIndex(chord.charIndex, line.text),
              }))
            : [];
          return { ...line, chords };
        }),
      };
    }),
  };
}

/** Strictly-drum fields of a section playback override (chord style is not a drum field). */
function sourceDrumFields(override: OriginalsSectionPlaybackOverride | undefined): {
  drumsEnabled?: boolean;
  drumPattern?: string;
} {
  if (override?.customPlayback !== true) return {};
  return { drumsEnabled: override.drumsEnabled, drumPattern: override.drumPattern };
}

/**
 * Overwrite a sibling's drum fields with the source's, preserving the sibling's
 * own chord style. Returns undefined when nothing custom remains (inherit global).
 */
function withSourceDrums(
  sibling: OriginalsSectionPlaybackOverride | undefined,
  drums: { drumsEnabled?: boolean; drumPattern?: string },
): OriginalsSectionPlaybackOverride | undefined {
  const chordStyleId = sibling?.chordStyleId;
  const hasStyle = chordStyleId !== undefined;
  const hasDrums = drums.drumsEnabled !== undefined || drums.drumPattern !== undefined;
  if (!hasStyle && !hasDrums) return undefined;

  const next: OriginalsSectionPlaybackOverride = { customPlayback: true };
  if (hasStyle) next.chordStyleId = chordStyleId;
  if (drums.drumsEnabled !== undefined) next.drumsEnabled = drums.drumsEnabled;
  if (drums.drumPattern !== undefined) next.drumPattern = drums.drumPattern;
  return next;
}

/**
 * Copy the source section's drum settings onto every other same-type section,
 * preserving each sibling's own chord style. When the source drums inherit
 * global playback, the siblings' drum fields are reset (chord style untouched).
 */
export function applySectionDrumsToSameType(
  overrides: Record<string, OriginalsSectionPlaybackOverride> | undefined,
  layout: ChartLayout,
  sourceSectionId: string,
): Record<string, OriginalsSectionPlaybackOverride> | undefined {
  const source = layout.sections.find((section) => section.sectionId === sourceSectionId);
  if (!source || !isGroupableType(source.type)) return overrides;

  const drums = sourceDrumFields(overrides?.[sourceSectionId]);
  const next: Record<string, OriginalsSectionPlaybackOverride> = { ...(overrides ?? {}) };

  for (const section of layout.sections) {
    if (section.sectionId === sourceSectionId || section.type !== source.type) continue;
    const merged = withSourceDrums(next[section.sectionId], drums);
    if (merged) {
      next[section.sectionId] = merged;
    } else {
      delete next[section.sectionId];
    }
  }

  return Object.keys(next).length > 0 ? next : undefined;
}
