import type { PianoScore } from './types';

export function getMeasureCountForScore(score: PianoScore): number {
  return Math.max(...score.parts.map((part) => part.measures.length), 0);
}

export function computeAutoZoomLevel(measureCount: number): number {
  if (measureCount > 40) return 0.6;
  if (measureCount > 20) return 0.7;
  if (measureCount > 8) return 0.85;
  return 1.0;
}
