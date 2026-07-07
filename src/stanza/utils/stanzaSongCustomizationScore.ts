import type { StanzaMarker, StanzaSong } from '../db/stanzaDb';
import type { StanzaSongDriveRow } from '../drive/stanzaDriveEnvelope';

/** Default single-letter section labels from import/bootstrap (not user customization). */
const DEFAULT_SECTION_LABEL = /^[A-Z]$/;

export function isCustomMarkerLabel(label: string): boolean {
  const t = label.trim();
  if (!t) return false;
  return !DEFAULT_SECTION_LABEL.test(t);
}

function markerCustomizationPoints(markers: StanzaMarker[]): number {
  if (markers.length === 0) return 0;
  let score = 0;
  // First boundary at t=0 is implicit; extra markers are user sectioning work.
  const beyondStart = markers.filter((m) => m.time > 0.02).length;
  score += beyondStart * 10;
  for (const m of markers) {
    if (isCustomMarkerLabel(m.label)) score += 2;
  }
  return score;
}

type ScoreInput = StanzaSong | StanzaSongDriveRow;

/** Higher score = more practice customization (sections, stats, metronome, skips). */
export function stanzaSongPracticeCustomizationScore(row: ScoreInput): number {
  let score = markerCustomizationPoints(row.markers ?? []);

  const stats = row.stats ?? {};
  score += Object.keys(stats).length;

  const metronomeBySegmentId = row.metronomeBySegmentId ?? {};
  score += Object.keys(metronomeBySegmentId).length;

  const drumPatternBySegmentId = row.drumPatternBySegmentId ?? {};
  score += Object.keys(drumPatternBySegmentId).length;

  const skippedBySegmentId = row.skippedBySegmentId ?? {};
  score += Object.keys(skippedBySegmentId).length;

  if (row.metronomeSongCalibration) score += 5;

  if (row.metronomeEnabled) score += 3;
  if (row.drumsEnabled) score += 3;

  return score;
}

export function stanzaMarkerCount(row: ScoreInput): number {
  return row.markers?.length ?? 0;
}
