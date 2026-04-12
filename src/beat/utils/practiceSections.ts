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
  alignLoopToMetronome?: boolean;
  correctedDetectedKey?: string | null;
  transposeSemitones?: number;
  youtubeManualBpm?: number;
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
