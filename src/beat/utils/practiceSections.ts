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
