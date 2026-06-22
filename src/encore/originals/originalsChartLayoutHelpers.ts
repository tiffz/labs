import type { ChartLayout } from '../../shared/music/chordPro/chordChartLayout';

/** True when the chart has at least one painted chord marker (styled read view). */
export function chartLayoutHasPaintedChords(layout: ChartLayout): boolean {
  return layout.sections.some((section) => section.lines.some((line) => line.chords.length > 0));
}
