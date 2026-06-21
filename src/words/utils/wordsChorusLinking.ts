import type { SongSection } from '../../shared/music/songSections';
import { buildEffectiveSections } from './wordsSectionPlans';

export type ChorusLinkAggregate = 'all-linked' | 'all-unlinked' | 'mixed';

export function countChorusSections(sections: SongSection[]): number {
  return sections.filter((section) => section.type === 'chorus').length;
}

function getChorusLinkAggregate(
  sections: SongSection[],
  flag: 'linkedToPreviousChorusLyrics' | 'linkedToPreviousChorusTemplate'
): ChorusLinkAggregate | null {
  const choruses = sections.filter((section) => section.type === 'chorus');
  if (choruses.length < 2) return null;
  const linkedCount = choruses.filter((section) => section[flag]).length;
  if (linkedCount === choruses.length) return 'all-linked';
  if (linkedCount === 0) return 'all-unlinked';
  return 'mixed';
}

export function getChorusLyricsLinkAggregate(
  sections: SongSection[]
): ChorusLinkAggregate | null {
  return getChorusLinkAggregate(sections, 'linkedToPreviousChorusLyrics');
}

export function getChorusTemplateLinkAggregate(
  sections: SongSection[]
): ChorusLinkAggregate | null {
  return getChorusLinkAggregate(sections, 'linkedToPreviousChorusTemplate');
}

export function findFirstChorusSection(sections: SongSection[]): SongSection | null {
  return sections.find((section) => section.type === 'chorus') ?? null;
}

export function applyLinkAllChorusLyrics(sections: SongSection[]): SongSection[] {
  const firstChorus = findFirstChorusSection(sections);
  if (!firstChorus) return sections;
  const canonicalLyrics = firstChorus.lyrics;
  return sections.map((section) => {
    if (section.type !== 'chorus') return section;
    return {
      ...section,
      linkedToPreviousChorusLyrics: true,
      lyrics: canonicalLyrics,
    };
  });
}

export function applyUnlinkAllChorusLyrics(sections: SongSection[]): SongSection[] {
  const effectiveSections = buildEffectiveSections(sections);
  return sections.map((section, index) => {
    if (section.type !== 'chorus') return section;
    return {
      ...section,
      linkedToPreviousChorusLyrics: false,
      lyrics: effectiveSections[index]?.effectiveLyrics ?? section.lyrics,
    };
  });
}

export function applyLinkAllChorusTemplates(sections: SongSection[]): SongSection[] {
  const firstChorus = findFirstChorusSection(sections);
  if (!firstChorus) return sections;
  const canonicalTemplate = firstChorus.templateNotation;
  return sections.map((section) => {
    if (section.type !== 'chorus') return section;
    return {
      ...section,
      linkedToPreviousChorusTemplate: true,
      templateNotation: canonicalTemplate,
    };
  });
}

export function applyUnlinkAllChorusTemplates(sections: SongSection[]): SongSection[] {
  const effectiveSections = buildEffectiveSections(sections);
  return sections.map((section, index) => {
    if (section.type !== 'chorus') return section;
    return {
      ...section,
      linkedToPreviousChorusTemplate: false,
      templateNotation:
        effectiveSections[index]?.effectiveTemplateNotation ?? section.templateNotation,
    };
  });
}

export function chorusLinkAggregateLabel(aggregate: ChorusLinkAggregate): string {
  if (aggregate === 'all-linked') return 'All linked';
  if (aggregate === 'all-unlinked') return 'All unlinked';
  return 'Mixed';
}
