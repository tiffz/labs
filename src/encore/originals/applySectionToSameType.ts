import {
  snapChordColumnToCharIndex,
  type ChartLayout,
  type SectionType,
} from '../../shared/music/chordPro/chordChartLayout';
import type { OriginalsSectionPlaybackOverride } from './sectionPlaybackOverrides';

/** Lowercase plural noun for a section type, for "Apply chords to all {plural}" copy. */
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

/** Count sections that share the given section's type (including itself). 0 when the id is unknown. */
export function countSameTypeSections(layout: ChartLayout, sectionId: string): number {
  const source = layout.sections.find((section) => section.sectionId === sectionId);
  if (!source) return 0;
  return layout.sections.filter((section) => section.type === source.type).length;
}

/** True when the apply-to-all actions are worth offering (more than one section of this type). */
export function canApplySectionToSameType(layout: ChartLayout, sectionId: string): boolean {
  return countSameTypeSections(layout, sectionId) > 1;
}

/**
 * Copy the source section's per-line chords onto every other same-type section.
 * Chords map line-by-line by index; each chord's column snaps to the target line's words.
 * Target lines past the source's line count are cleared so each sibling mirrors the source.
 */
export function applySectionChordsToSameType(
  layout: ChartLayout,
  sourceSectionId: string,
): ChartLayout {
  const source = layout.sections.find((section) => section.sectionId === sourceSectionId);
  if (!source) return layout;

  return {
    sections: layout.sections.map((section) => {
      if (section.sectionId === sourceSectionId || section.type !== source.type) {
        return section;
      }
      return {
        ...section,
        lines: section.lines.map((line, lineIndex) => {
          const sourceLine = source.lines[lineIndex];
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

/**
 * Copy the source section's playback (drum) override onto every other same-type section.
 * When the source inherits global playback, same-type siblings are reset to inherit too.
 */
export function applySectionDrumsToSameType(
  overrides: Record<string, OriginalsSectionPlaybackOverride> | undefined,
  layout: ChartLayout,
  sourceSectionId: string,
): Record<string, OriginalsSectionPlaybackOverride> | undefined {
  const source = layout.sections.find((section) => section.sectionId === sourceSectionId);
  if (!source) return overrides;

  const sourceOverride = overrides?.[sourceSectionId];
  const next: Record<string, OriginalsSectionPlaybackOverride> = { ...(overrides ?? {}) };

  for (const section of layout.sections) {
    if (section.sectionId === sourceSectionId || section.type !== source.type) continue;
    if (sourceOverride) {
      next[section.sectionId] = { ...sourceOverride };
    } else {
      delete next[section.sectionId];
    }
  }

  return Object.keys(next).length > 0 ? next : undefined;
}
