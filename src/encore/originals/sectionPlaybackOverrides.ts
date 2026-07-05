import type { SectionPlaybackOverride } from '../../shared/music/resolveSectionPlaybackSettings';
import type { ChordPlaybackSettings } from '../../shared/music/chordPlaybackSettings';

export type OriginalsSectionPlaybackOverride = SectionPlaybackOverride;

export function setOriginalsSectionPlaybackOverride(
  current: Record<string, OriginalsSectionPlaybackOverride> | undefined,
  sectionId: string,
  override: OriginalsSectionPlaybackOverride | null,
): Record<string, OriginalsSectionPlaybackOverride> | undefined {
  const next = { ...(current ?? {}) };
  if (override === null) {
    delete next[sectionId];
  } else {
    next[sectionId] = override;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export function createSectionPlaybackOverrideFromGlobal(
  globalSettings: ChordPlaybackSettings,
): OriginalsSectionPlaybackOverride {
  return {
    customPlayback: true,
    chordStyleId: globalSettings.chordStyleId,
    drumsEnabled: globalSettings.drumsEnabled,
    drumPattern: globalSettings.drumPattern,
  };
}
