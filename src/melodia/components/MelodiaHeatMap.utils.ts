import type { MelodiaStaffLayout } from './MelodiaStaff';
import type { PitchPerNote } from '../analysis';

export const HEAT_MAX_OPACITY = 0.55;

export function driftOpacity(note: PitchPerNote): number {
  if (note.samplesUsed <= 0) return 0;
  const drift = (note.samplesUsed - note.closeCount) / Math.max(1, note.samplesUsed);
  return Math.max(0, Math.min(HEAT_MAX_OPACITY, drift * HEAT_MAX_OPACITY));
}

export interface HeatRect {
  index: number;
  x: number;
  width: number;
  opacity: number;
  tooltip: string;
}

export function buildHeatRects(
  layout: MelodiaStaffLayout,
  perNote: PitchPerNote[],
): HeatRect[] {
  const out: HeatRect[] = [];
  if (layout.noteFrames.length === 0) return out;
  const sorted = [...layout.noteFrames].sort((a, b) => a.x - b.x);
  for (let i = 0; i < sorted.length; i += 1) {
    const frame = sorted[i]!;
    const next = sorted[i + 1];
    const xLeft = Math.max(layout.staveX, frame.x - 8);
    const xRight = next ? next.x : layout.staveX + layout.staveWidth;
    const width = Math.max(8, xRight - xLeft);
    const stat = perNote.find((p) => p.index === frame.index);
    if (!stat) continue;
    const opacity = driftOpacity(stat);
    const drifted = Math.max(0, stat.samplesUsed - stat.closeCount);
    const tooltip =
      stat.samplesUsed === 0
        ? 'No samples landed on this note'
        : `${drifted} of ${stat.samplesUsed} samples drifted ≥ 1 semitone here`;
    out.push({ index: frame.index, x: xLeft, width, opacity, tooltip });
  }
  return out;
}
