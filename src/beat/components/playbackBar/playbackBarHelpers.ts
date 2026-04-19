import type { Section } from '../../utils/sectionDetector';
import type { ChordEvent, KeyChange } from '../../utils/chordAnalyzer';
import type { TempoRegion } from '../../utils/tempoRegions';

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** "M48-59" -> "M48", "M1-8" -> "M1". Falls back to the original label. */
export function getShortSectionLabel(label: string): string {
  const match = label.match(/^(M\d+)/);
  return match ? match[1] : label;
}

/** Build the measure-range summary for the currently selected sections. */
export function getSelectionLabel(
  activeSelectionIds: string[],
  activeSections: Section[],
): string {
  if (activeSelectionIds.length === 0) return '';

  const selectedSections = activeSections
    .filter((s) => activeSelectionIds.includes(s.id))
    .sort((a, b) => a.startTime - b.startTime);

  if (selectedSections.length === 0) return '';

  const firstMatch = selectedSections[0].label.match(/M(\d+)/);
  const firstMeasure = firstMatch ? firstMatch[1] : '?';

  const lastSection = selectedSections[selectedSections.length - 1];
  const lastMatch = lastSection.label.match(/M\d+-(\d+)/);
  const lastMeasure = lastMatch ? lastMatch[1] : firstMeasure;

  const selectionStart = selectedSections[0].startTime;
  const selectionEnd = selectedSections[selectedSections.length - 1].endTime;
  const selectionSeconds = Math.max(0, selectionEnd - selectionStart);

  if (firstMeasure === lastMeasure) {
    return `M${firstMeasure} · ${selectionSeconds.toFixed(1)}s`;
  }
  return `M${firstMeasure}–${lastMeasure} · ${selectionSeconds.toFixed(1)}s`;
}

/** Up to 6 unique non-"N" chords within a section, in order of first appearance. */
export function getChordsForSection(
  section: Section,
  chordChanges: ChordEvent[],
): string[] {
  if (chordChanges.length === 0) return [];

  const sectionChords = chordChanges.filter(
    (c) => c.time >= section.startTime && c.time < section.endTime && c.chord !== 'N',
  );

  const seen = new Set<string>();
  const uniqueChords: string[] = [];
  for (const c of sectionChords) {
    if (!seen.has(c.chord)) {
      seen.add(c.chord);
      uniqueChords.push(c.chord);
    }
  }

  return uniqueChords.slice(0, 6);
}

/**
 * Returns the first key change that starts inside the section. Leniency of
 * 2s at the start handles cases where the key-change timestamp and section
 * boundary snapped to slightly different times.
 */
export function getKeyChangeForSection(
  section: Section,
  keyChanges: KeyChange[],
): KeyChange | null {
  if (keyChanges.length === 0) return null;
  return (
    keyChanges.find(
      (k) => k.time >= section.startTime - 2 && k.time < section.endTime,
    ) ?? null
  );
}

export interface SectionTempoInfo {
  bpm: number | null;
  hasFermata: boolean;
  description: string | null;
}

export function getTempoInfoForSection(
  section: Section,
  tempoRegions: TempoRegion[] | undefined,
): SectionTempoInfo {
  if (!tempoRegions || tempoRegions.length === 0) {
    return { bpm: null, hasFermata: false, description: null };
  }

  const overlappingRegions = tempoRegions.filter(
    (r) => r.startTime < section.endTime && r.endTime > section.startTime,
  );
  if (overlappingRegions.length === 0) {
    return { bpm: null, hasFermata: false, description: null };
  }

  const hasFermata = overlappingRegions.some((r) => r.type === 'fermata');

  const steadyRegions = overlappingRegions.filter(
    (r) => r.type === 'steady' && r.bpm !== null,
  );
  const primaryBpm = steadyRegions.length > 0 ? steadyRegions[0].bpm : null;

  let description: string | null = null;
  const tempoTypes = overlappingRegions.filter((r) => r.type !== 'steady');
  if (tempoTypes.length > 0) {
    const typeDescriptions = tempoTypes.map((r) => {
      if (r.description) return r.description;
      const timeStr = formatTime(r.startTime);
      const durationStr = `${(r.endTime - r.startTime).toFixed(1)}s`;
      if (r.type === 'fermata') return `Fermata at ${timeStr} (${durationStr})`;
      if (r.type === 'rubato') return `Free tempo at ${timeStr}`;
      if (r.type === 'accelerando') return `Speeds up at ${timeStr}`;
      if (r.type === 'ritardando') return `Slows down at ${timeStr}`;
      return r.type;
    });
    description = typeDescriptions.join(' · ');
  }

  const uniqueBpms = [...new Set(steadyRegions.map((r) => r.bpm))];
  if (uniqueBpms.length > 1) {
    description = description
      ? `${description} · tempo changes`
      : `tempo changes (${uniqueBpms.join(' → ')} BPM)`;
  }

  return { bpm: primaryBpm, hasFermata, description };
}
