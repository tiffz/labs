import type { ChordStyleId } from './chordStyleOptions';
import type { SoundType } from './soundOptions';
import type { TimeSignature } from './chordTypes';

/** Chart chord playback assumes 4/4 (two quarter-note measures per lyric line). */
export const CHART_CHORD_PLAYBACK_TIME_SIGNATURE: TimeSignature = {
  numerator: 4,
  denominator: 4,
};

export type ChordPlaybackSettings = {
  chordStyleId: ChordStyleId;
  soundType: SoundType;
  chordVolume: number;
  chordMuted: boolean;
  drumsEnabled: boolean;
  drumsVolume: number;
  drumsMuted: boolean;
  /** Darbuka-style notation for one 4/4 measure (e.g. `D---D---D---D---`). */
  drumPattern: string;
};

export const DEFAULT_CHORD_PLAYBACK_SETTINGS: ChordPlaybackSettings = {
  chordStyleId: 'simple',
  soundType: 'piano',
  chordVolume: 72,
  chordMuted: false,
  drumsEnabled: false,
  drumsVolume: 42,
  drumsMuted: false,
  drumPattern: 'D---D---D---D---',
};

export function loadChordPlaybackSettings(
  storageKey: string,
  fallback: ChordPlaybackSettings = DEFAULT_CHORD_PLAYBACK_SETTINGS,
): ChordPlaybackSettings {
  try {
    // localStorage, not sessionStorage: song-wide chord/drum settings must survive
    // a tab close and a new tab. sessionStorage is per-tab and wiped on session end,
    // which reset the song-wide drum config to defaults (drumsEnabled defaults to
    // false, so song-wide drums vanished while per-section overrides in Dexie stayed).
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { ...fallback };
    const parsed = JSON.parse(raw) as Partial<ChordPlaybackSettings>;
    return { ...fallback, ...parsed };
  } catch {
    return { ...fallback };
  }
}

export function saveChordPlaybackSettings(storageKey: string, settings: ChordPlaybackSettings): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function effectiveChordPlaybackVelocity(settings: ChordPlaybackSettings): number {
  if (settings.chordMuted) return 0;
  return Math.max(0, Math.min(1, settings.chordVolume / 100));
}

export function effectiveDrumPlaybackVolume(settings: ChordPlaybackSettings): number {
  if (!settings.drumsEnabled || settings.drumsMuted) return 0;
  return Math.max(0, Math.min(1, settings.drumsVolume / 100));
}
