import type { SongSection } from '../../shared/music/songSections';

export function cloneSectionsSnapshot(sections: SongSection[]): SongSection[] {
  return sections.map((section) => ({ ...section }));
}

export function normalizeSection(section: SongSection): SongSection {
  const raw = section as SongSection & { templateBias?: number };
  const { templateBias: _dropLegacyTemplateBias, ...rest } = raw; // eslint-disable-line @typescript-eslint/no-unused-vars
  return {
    ...rest,
    isLocked: section.isLocked ?? false,
  };
}

export function normalizeSectionsSnapshot(sections: SongSection[]): SongSection[] {
  return sections.map(normalizeSection);
}
