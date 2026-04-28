import type { SubdivisionGrid } from './singInTimeClock';
import { BEATS_PER_MEASURE, buildClickSchedule, slotsPerMeasure } from './singInTimeClock';

/**
 * Nearest grid subdivision instant to a vocal onset, in session-relative seconds,
 * and signed delta in milliseconds (positive = late vs target).
 *
 * `latencyCompensationMs` is subtracted from the raw onset offset so measured
 * microphone delay does not inflate "late" judgements (see scales mic pipeline).
 */

export interface NearestRhythmHit {
  targetSec: number;
  deltaMsRaw: number;
  deltaMs: number;
  slotIndexGlobal: number;
}

/**
 * Absolute session time → nearest click target within [0, totalDuration].
 */
export function nearestGridTargetSec(
  sessionElapsedSec: number,
  bpm: number,
  grid: SubdivisionGrid,
  measures: number,
): NearestRhythmHit {
  const sched = buildClickSchedule(grid, bpm, measures, false);
  if (sched.length === 0) {
    return {
      targetSec: 0,
      deltaMsRaw: 0,
      deltaMs: 0,
      slotIndexGlobal: 0,
    };
  }

  let best = sched[0]!;
  let bestDist = Math.abs(sessionElapsedSec - best.time);

  for (let i = 1; i < sched.length; i++) {
    const s = sched[i]!;
    const d = Math.abs(sessionElapsedSec - s.time);
    if (d < bestDist) {
      best = s;
      bestDist = d;
    }
  }

  const idx = sched.indexOf(best);
  const deltaMsRaw = (sessionElapsedSec - best.time) * 1000;

  return {
    targetSec: best.time,
    deltaMsRaw,
    deltaMs: deltaMsRaw,
    slotIndexGlobal: idx,
  };
}

export function applyLatencyCompensation(deltaMsRaw: number, latencyCompensationMs: number): number {
  return deltaMsRaw - latencyCompensationMs;
}

export function expectedNoteCountForExercise(
  grid: SubdivisionGrid,
  measures: number,
  notesPerMeasureOverride?: number,
): number {
  if (typeof notesPerMeasureOverride === 'number') {
    return notesPerMeasureOverride * measures;
  }
  if (grid === 'mixed') {
    return 24 * measures;
  }
  return slotsPerMeasure(grid as Exclude<SubdivisionGrid, 'mixed'>) * measures;
}

export { BEATS_PER_MEASURE };
