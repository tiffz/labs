import type { OriginalsWorkflowStage } from './originalsWorkflowStages';

/** Write workspace stage for chart edit — chords when visible, otherwise lyrics. */
export function resolveOriginalsChartEditStage(
  showChords: boolean,
  hasPaintedChords: boolean,
): OriginalsWorkflowStage {
  return showChords && hasPaintedChords ? 'chords' : 'write';
}
