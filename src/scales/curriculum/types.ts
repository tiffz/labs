import type { Key } from '../../shared/music/scoreTypes';

export type Hand = 'right' | 'left' | 'both';
export type ExerciseKind = 'major-scale' | 'natural-minor-scale' | 'arpeggio-major' | 'arpeggio-minor';
export type SubdivisionMode = 'none' | 'eighth' | 'sixteenth';

/**
 * A stage represents one level of mastery for a single key+exercise.
 * Stages are pedagogically ordered: learn notes → add tempo → refine.
 */
export interface Stage {
  id: string;
  stageNumber: number;
  label: string;
  hand: Hand;
  useTempo: boolean;
  bpm: number;
  useMetronome: boolean;
  subdivision: SubdivisionMode;
  /** If true, playback sounds are removed — user plays from memory. */
  mutePlayback: boolean;
}

/**
 * All stages for a single key+exercise combination (e.g. C major scale).
 */
export interface ExerciseDefinition {
  id: string;
  key: Key;
  kind: ExerciseKind;
  label: string;
  stages: Stage[];
}

/**
 * A tier groups several keys that are introduced together.
 * Within a tier, the user works through all stages for each key before advancing.
 */
export interface Tier {
  id: string;
  tierNumber: number;
  label: string;
  description: string;
  exercises: ExerciseDefinition[];
}

/**
 * A single exercise in a practice session plan.
 */
export interface SessionExercise {
  exerciseId: string;
  stageId: string;
  key: Key;
  kind: ExerciseKind;
  hand: Hand;
  bpm: number;
  useMetronome: boolean;
  subdivision: SubdivisionMode;
  mutePlayback: boolean;
  /** 'new' = advancing curriculum, 'review' = reinforcing previous material */
  purpose: 'new' | 'review';
}

export interface SessionPlan {
  exercises: SessionExercise[];
  generatedAt: number;
}
