import type { Section } from './sectionDetector';

export interface SuggestedSectionMarker {
  time: number;
  label: string;
}

export function sectionsToSuggestedMarkers(sections: Section[]): SuggestedSectionMarker[] {
  const markers: SuggestedSectionMarker[] = [];
  for (let i = 1; i < sections.length; i += 1) {
    const section = sections[i];
    if (section.startTime <= 0.05) continue;
    markers.push({
      time: section.startTime,
      label: section.label || `Section ${i + 1}`,
    });
  }
  return markers;
}
