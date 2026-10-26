import type { OriginalsWorkflowStage } from './originalsWorkflowStages';

/**
 * Write workspace stage for chart edit: chords when visible, otherwise lyrics. An instrumental has
 * no lyrics to edit, so its chart always opens in the chords editor.
 */
export function resolveOriginalsChartEditStage(
  showChords: boolean,
  hasPaintedChords: boolean,
  instrumental = false,
): OriginalsWorkflowStage {
  if (instrumental) return 'chords';
  return showChords && hasPaintedChords ? 'chords' : 'write';
}
