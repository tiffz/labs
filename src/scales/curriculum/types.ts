import type { Key } from '../../shared/music/scoreTypes';

export type Hand = 'right' | 'left' | 'both';
export type ExerciseKind = 'major-scale' | 'natural-minor-scale' | 'arpeggio-major' | 'arpeggio-minor';
/**
 * How many notes-per-beat the stage practices. 'triplet' is three notes
 * per beat (eighth-note triplets) and sits between `eighth` and `sixteenth`
 * in difficulty — it's a distinct rhythmic-feel milestone, not just a
 * visual skin.
 */
export type SubdivisionMode = 'none' | 'eighth' | 'triplet' | 'sixteenth';

/**
 * A stage represents one level of mastery for a single key+exercise.
 * Stages are pedagogically ordered: learn notes → add tempo → refine.
 */
export interface Stage {
  id: string;
  stageNumber: number;
  label: string;
  /** Player-facing explanation of what to focus on in this stage. */
  description: string;
  hand: Hand;
  useTempo: boolean;
  bpm: number;
  useMetronome: boolean;
  subdivision: SubdivisionMode;
  /** If true, playback sounds are removed — user plays from memory. */
  mutePlayback: boolean;
  /**
   * How wide the ascending/descending pattern is. 1-octave is the beginner
   * scaffold; 2-octave is the pedagogical baseline for "knowing a scale"
   * (RCM Gr 2-3 and equivalent). Defaulted to 1 on existing stages so the
   * field can be added without a curriculum migration.
   */
  octaves: 1 | 2;
  /**
   * Optional checkpoint marker. `'fluent-checkpoint'` designates the stage
   * that separates "Learning" from "Fluent" in the two-tier mastery model:
   * passing it means the learner can play the exercise in real time, even
   * if later stages (subdivisions, wider range) still lie ahead before
   * full "Mastered" status.
   */
  kind?: 'fluent-checkpoint';
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
  /**
   * Exercise-specific intro guidance shown in the instruction panel.
   * A string applies to all stages; an object maps per-hand guidance.
   */
  guidance?: string | { right?: string; left?: string; both?: string };
  /** Optional external help link (e.g. YouTube search). */
  helpUrl?: string;
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
  /** Octave span carried from the stage so score generation / grading match. */
  octaves: 1 | 2;
  /** 'new' = advancing curriculum, 'review' = reinforcing previous material */
  purpose: 'new' | 'review';
}

export interface SessionPlan {
  exercises: SessionExercise[];
  generatedAt: number;
}
