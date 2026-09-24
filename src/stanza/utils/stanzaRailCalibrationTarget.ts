/**
 * Which section the metronome calibration rail is editing.
 *
 * The rail follows, in order: the section you last clicked, else the lowest-numbered selected
 * section, else whatever is playing, else the first section.
 *
 * `lastClicked` is deliberately separate from the selection. Clicking a section both selects it and
 * pins the rail to it; "Deselect sections" clears the selection, so it must clear the pin too —
 * otherwise the rail keeps editing a section the user can no longer see selected, with no way back
 * short of switching songs. That was the reported dead end: "edit section state can't be returned
 * from".
 */
export interface StanzaRailCalibrationTargetInput {
  segmentCount: number;
  lastClickedIndex: number | null;
  selectedIndices: readonly number[];
  playbackIndex: number | null;
}

export function resolveStanzaRailCalibrationIndex({
  segmentCount,
  lastClickedIndex,
  selectedIndices,
  playbackIndex,
}: StanzaRailCalibrationTargetInput): number | null {
  if (segmentCount <= 0) return null;

  const inRange = (i: number | null): boolean => i != null && i >= 0 && i < segmentCount;

  if (inRange(lastClickedIndex)) return lastClickedIndex;
  const selected = selectedIndices.filter((i) => i >= 0 && i < segmentCount);
  if (selected.length > 0) return Math.min(...selected);
  if (inRange(playbackIndex)) return playbackIndex;
  return 0;
}
