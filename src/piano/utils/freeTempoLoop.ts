import type { PianoScore } from '../types';
import { findNextFreeTempoPosition } from './storeScoreEditing';

export function resolveFreeTempoLoopStartPosition(
  practicedParts: PianoScore['parts'],
  startMeasure: number
): { measureIndex: number; noteIndex: number } {
  const firstPlayable = findNextFreeTempoPosition(practicedParts, startMeasure, -1);
  return {
    measureIndex: firstPlayable?.measureIndex ?? startMeasure,
    noteIndex: firstPlayable?.noteIndex ?? -1,
  };
}
