import type { StanzaMarker } from '../db/stanzaDb';
import { ensureMarkerIds } from './segments';

export interface BeatPracticeSectionRow {
  id: string;
  label: string;
  startTime: number;
  endTime: number;
}

/** Map Find the Beat practice sections to Stanza section boundary markers. */
export function beatPracticeSectionsToStanzaMarkers(sections: BeatPracticeSectionRow[]): StanzaMarker[] {
  const boundaryTimes = new Set<number>();
  for (const section of sections) {
    if (section.startTime > 0.05) boundaryTimes.add(section.startTime);
  }
  return ensureMarkerIds(
    [...boundaryTimes]
      .sort((a, b) => a - b)
      .map((time) => {
        const section = sections.find((s) => Math.abs(s.startTime - time) < 0.05);
        return {
          id: crypto.randomUUID(),
          time,
          label: section?.label ?? `Section ${time}`,
        };
      }),
  );
}
