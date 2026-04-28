import type { PianoScore } from '../shared/music/scoreTypes';

export type MasteryTier = 'none' | 'bronze' | 'silver' | 'gold';

export interface MelodiaExercise {
  id: string;
  score: PianoScore;
  sourceHash: string;
  /** Display label (import filename or curriculum title) */
  fileName?: string;
  bookRef?: string;
  number?: number;
}

export interface PitchTrailPoint {
  t: number;
  midi: number | null;
}
