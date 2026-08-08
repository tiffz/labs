import type { Key } from '../../shared/music/scoreTypes';

export type { Key } from '../../shared/music/scoreTypes';

export type Hand = 'right' | 'left' | 'both';
/**
 * Pedagogically distinct exercise types. The minor scale is split into
 * three variants because they sound and behave differently:
 *
 *  - `pentascale-major` / `pentascale-minor` — five-finger patterns
 *    (C-D-E-F-G in C major, C-D-E\u266D-F-G in C minor). One finger
 *    per note, no thumb-unders, no horizontal travel. The universal
 *    onboarding rung in mainstream piano method (Faber/Alfred/Bastien
 *    book 1, RCM Preparatory, ABRSM Initial). Sits before full scales.
 *  - `natural-minor-scale` — the "white-key minor" (relative to its
 *    parallel major). Same notes ascending and descending.
 *  - `harmonic-minor-scale` — natural minor with a raised 7th. The
 *    augmented second between scale degrees 6 and 7 is the harmonic-
 *    minor signature; same notes ascending and descending.
 *  - `melodic-minor-scale` — direction-dependent. Ascending uses raised
 *    6 + raised 7 (a major scale with a flat 3); descending reverts to
 *    natural minor. The asymmetry is intentional and historically
 *    motivated by the leading-tone resolution at the top of the scale.
 */
export type ExerciseKind =
  | 'pentascale-major'
  | 'pentascale-minor'
  | 'major-scale'
  | 'natural-minor-scale'
  | 'harmonic-minor-scale'
  | 'melodic-minor-scale'
  | 'arpeggio-major'
  | 'arpeggio-minor';
/**
 * How many notes-per-beat the stage practices. 'triplet' is three notes
 * per beat (eighth-note triplets) and sits between `eighth` and `sixteenth`
 * in difficulty — it's a distinct rhythmic-feel milestone, not just a
 * visual skin.
 */
export type SubdivisionMode = 'none' | 'eighth' | 'triplet' | 'sixteenth';

/** Metronome click density for subdivision stages. Default `'beat'`. */
export type ClickMode = 'beat' | 'subdivision';

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
  /**
   * `'subdivision'` = click on every subdivision slot (beat accented).
   * `'beat'` or omitted = quarter-note clicks only.
   */
  clickMode?: ClickMode;
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
  clickMode: ClickMode;
  mutePlayback: boolean;
  /** Octave span carried from the stage so score generation / grading match. */
  octaves: 1 | 2;
  /** 'new' = advancing curriculum, 'review' = reinforcing previous material */
  purpose: 'new' | 'review';
}

/**
 * Where a session's exercises came from. Absent is treated as `'curriculum'`
 * so old persisted snapshots (which predate this field) keep the original
 * behavior. Non-curriculum plans (`'free'`, `'routine'`) run on the same
 * generic runtime but must NOT feed the linear ladder: on completion they
 * return home instead of chaining `planSession`, their runs are not recorded
 * into `progress.exercises`, and snapshot-resume validates them by
 * "score is generatable" rather than by curriculum lookup/unlock.
 */
export type SessionPlanKind = 'curriculum' | 'free' | 'routine';

export interface SessionPlan {
  exercises: SessionExercise[];
  generatedAt: number;
  /** @see SessionPlanKind. Absent = `'curriculum'`. */
  kind?: SessionPlanKind;
}

/**
 * One user-chosen practice item — the free-practice tuple. Shared by
 * free practice (a one-item session) and custom routines (an ordered list).
 * Unlike a curriculum {@link Stage}, it carries no stage id or advancement
 * semantics: it is pure "what to play". Optional fields default to a plain
 * metronome run at the given tempo.
 */
export interface PracticeItem {
  kind: ExerciseKind;
  key: Key;
  hand: Hand;
  octaves: 1 | 2;
  bpm: number;
  subdivision: SubdivisionMode;
  useMetronome?: boolean;
  clickMode?: ClickMode;
  mutePlayback?: boolean;
}

/**
 * A named, user-defined practice routine — an ordered list of {@link PracticeItem}s
 * the app runs on autopilot exactly like a curriculum session, but with the
 * user's own content and in the order they set. Modeled on Encore's
 * `EncoreRepertoireSavedSearch` (id / name / updatedAt + payload).
 */
export interface ScalesCustomRoutine {
  id: string;
  name: string;
  /** ISO timestamp, last-writer-wins key for Drive merge. */
  updatedAt: string;
  items: PracticeItem[];
}
