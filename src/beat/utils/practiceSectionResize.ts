import { snapToMeasureStart } from './measureUtils';

export type PracticeSectionTiming = {
  startTime: number;
  endTime: number;
};

export function computePracticeSectionResize(params: {
  section: PracticeSectionTiming;
  edge: 'start' | 'end';
  newTime: number;
  effectiveDuration: number;
  alignLoopToMetronome: boolean;
  effectiveBpm: number;
  beatsPerMeasure: number;
  syncStartTime: number;
  minDuration?: number;
}): PracticeSectionTiming | null {
  const {
    section,
    edge,
    newTime,
    effectiveDuration,
    alignLoopToMetronome,
    effectiveBpm,
    beatsPerMeasure,
    syncStartTime,
    minDuration = 0.5,
  } = params;

  let clampedTime = Math.max(0, Math.min(effectiveDuration, newTime));
  if (alignLoopToMetronome && effectiveBpm > 0) {
    clampedTime = snapToMeasureStart(
      clampedTime,
      effectiveBpm,
      syncStartTime,
      beatsPerMeasure
    );
  }

  if (edge === 'start' && clampedTime >= section.endTime - minDuration) return null;
  if (edge === 'end' && clampedTime <= section.startTime + minDuration) return null;

  return edge === 'start'
    ? { startTime: clampedTime, endTime: section.endTime }
    : { startTime: section.startTime, endTime: clampedTime };
}

/** Recompute loop bounds from selected practice sections after a resize. */
export function loopRegionForSelectedSections(
  sections: Array<{ id: string; startTime: number; endTime: number }>,
  selectedSectionIds: string[]
): { startTime: number; endTime: number } | null {
  const selected = sections.filter((section) => selectedSectionIds.includes(section.id));
  if (selected.length === 0) return null;
  return {
    startTime: Math.min(...selected.map((section) => section.startTime)),
    endTime: Math.max(...selected.map((section) => section.endTime)),
  };
}
