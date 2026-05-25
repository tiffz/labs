import type { Section } from './sectionDetector';
import type { UserPracticeLane, UserPracticeSection } from '../types/library';

export type LaneSection = Section & { laneId: string };

export type PracticeEditorSnapshot = {
  lanes: UserPracticeLane[];
  sections: LaneSection[];
  activeLaneId: string | null;
};

export function userSectionsStorageKey(videoId: string): string {
  return `beat:user-sections:${videoId}`;
}

export interface PerSongSettings {
  metronomeEnabled?: boolean;
  drumEnabled?: boolean;
  audioVolume?: number;
  metronomeVolume?: number;
  drumVolume?: number;
  audioMuted?: boolean;
  drumMuted?: boolean;
  metronomeMuted?: boolean;
  alignLoopToMetronome?: boolean;
  correctedDetectedKey?: string | null;
  transposeSemitones?: number;
  /** @deprecated Prefer `bpm`; kept for older saves. */
  youtubeManualBpm?: number;
  /** User-facing BPM (manual override for local analysis or YouTube). */
  bpm?: number;
  playbackRate?: number;
  /** User override for music start; omit or null = use detected analysis default. */
  syncStartTime?: number | null;
  loopEnabled?: boolean;
  loopRegion?: { startTime: number; endTime: number } | null;
  nudgeUnit?: 'measure' | 'beat';
}

export function readSavedSongBpm(saved: PerSongSettings | null | undefined): number | null {
  if (!saved) return null;
  if (typeof saved.bpm === 'number' && Number.isFinite(saved.bpm)) return saved.bpm;
  if (typeof saved.youtubeManualBpm === 'number' && Number.isFinite(saved.youtubeManualBpm)) {
    return saved.youtubeManualBpm;
  }
  return null;
}

export function songSettingsStorageKey(entryId: string): string {
  return `beat:song-settings:${entryId}`;
}

export function loadSongSettings(entryId: string): PerSongSettings | null {
  try {
    const raw = localStorage.getItem(songSettingsStorageKey(entryId));
    if (!raw) return null;
    return JSON.parse(raw) as PerSongSettings;
  } catch {
    return null;
  }
}

export function saveSongSettings(entryId: string, settings: PerSongSettings): void {
  try {
    localStorage.setItem(songSettingsStorageKey(entryId), JSON.stringify(settings));
  } catch { /* quota exceeded — silently ignore */ }
}

export function createUserLane(name: string): UserPracticeLane {
  return {
    id: `lane-${crypto.randomUUID()}`,
    name,
    createdAt: Date.now(),
  };
}

export function toLaneSection(
  section: UserPracticeSection,
  fallbackLaneId: string
): LaneSection {
  return {
    id: section.id,
    label: section.label,
    startTime: section.startTime,
    endTime: section.endTime,
    laneId: section.laneId ?? fallbackLaneId,
    color: '#7eb5c4',
    confidence: 1,
  };
}
