import type { LaneSection } from './practiceSections';

export function mergeAdjacentLaneSections(
  sections: LaneSection[],
  indexA: number,
  indexB: number
): LaneSection[] {
  const next = [...sections];
  let a = indexA;
  let b = indexB;
  if (a > b) [a, b] = [b, a];
  if (a < 0 || b >= next.length || b - a !== 1) return sections;
  if (next[a].laneId !== next[b].laneId) return sections;

  next[a] = {
    ...next[a],
    endTime: next[b].endTime,
  };
  next.splice(b, 1);
  return next;
}

export function splitLaneSection(
  sections: LaneSection[],
  index: number,
  splitTime: number
): LaneSection[] {
  if (index < 0 || index >= sections.length) return sections;
  const section = sections[index];
  if (splitTime <= section.startTime || splitTime >= section.endTime) return sections;

  const next = [...sections];
  next[index] = {
    ...section,
    endTime: splitTime,
    label: `${section.label} (a)`,
  };
  next.splice(index + 1, 0, {
    ...section,
    id: `user-${crypto.randomUUID()}`,
    startTime: splitTime,
    label: `${section.label} (b)`,
  });
  return next;
}
