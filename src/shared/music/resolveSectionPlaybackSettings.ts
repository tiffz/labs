import type { ChordStyleId } from './chordStyleOptions';
import type { ChordPlaybackSettings } from './chordPlaybackSettings';

/** Per-section playback override — unset fields inherit from song/session defaults. */
export type SectionPlaybackOverride = {
  /** When true, this section uses the fields below instead of inheriting global playback settings. */
  customPlayback?: boolean;
  chordStyleId?: ChordStyleId;
  drumsEnabled?: boolean;
  drumPattern?: string;
};

export function sectionUsesCustomPlayback(
  overrides: Record<string, SectionPlaybackOverride> | undefined,
  sectionId: string,
): boolean {
  return overrides?.[sectionId]?.customPlayback === true;
}

export function resolveSectionPlaybackSettings(
  globalSettings: ChordPlaybackSettings,
  overrides: Record<string, SectionPlaybackOverride> | undefined,
  sectionId: string,
): ChordPlaybackSettings {
  const override = overrides?.[sectionId];
  if (!override?.customPlayback) {
    return globalSettings;
  }
  return {
    ...globalSettings,
    chordStyleId: override.chordStyleId ?? globalSettings.chordStyleId,
    drumsEnabled: override.drumsEnabled ?? globalSettings.drumsEnabled,
    drumPattern: override.drumPattern ?? globalSettings.drumPattern,
  };
}
