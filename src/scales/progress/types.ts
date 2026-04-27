/** Per-note outcome counts from a finished run (same shape as session `ExerciseResult.breakdown`). */
export interface PracticeRunBreakdown {
  perfect: number;
  early: number;
  late: number;
  wrongPitch: number;
  missed: number;
}

export interface PracticeRecord {
  exerciseId: string;
  stageId: string;
  timestamp: number;
  accuracy: number;
  /** Number of notes in the exercise */
  noteCount: number;
  /** Number of notes played correctly */
  correctCount: number;
  /**
   * Populated on new runs for advancement / streak nuance (pentascale
   * tempo gates). Older saved history omits this — consumers fall back to
   * {@link accuracy} vs threshold only.
   */
  breakdown?: PracticeRunBreakdown;
  /**
   * 'drill' marks records produced during voluntary drill sessions
   * (see SessionScreen drill mode). Drill records still feed into
   * proficiency averaging via getExerciseProficiency, but skip the
   * shaky -> needsReview demotion path so a single off run during
   * polishing doesn't knock the user out of "Mastered". Default
   * 'normal' (or undefined for backwards-compat with older history).
   */
  purpose?: 'normal' | 'drill';
}

export interface ExerciseProgress {
  exerciseId: string;
  /** The highest stage the user has completed (passed advancement threshold). */
  completedStageId: string | null;
  /** The stage the user should practice next. */
  currentStageId: string;
  /** Recent practice records for this exercise (newest first, capped). */
  history: PracticeRecord[];
  /** Whether this exercise has been flagged for review. */
  needsReview: boolean;
  /**
   * The specific stage that triggered the current review flag — set when a
   * run comes in below the review threshold, cleared when that stage passes
   * again. Lets the review dialog and session planner target the shaky
   * stage instead of guessing from `completedStageId`.
   */
  reviewStageId: string | null;
  /** ISO timestamp of last practice. */
  lastPracticedAt: string | null;
}

/**
 * The contextual-guidance system tracks whether each pedagogical
 * concept has ever been introduced to the user. Once a flag flips to
 * true the corresponding concept intro never re-appears in the
 * onboarding modal.
 *
 * The flag set is intentionally additive: new concepts can be added in
 * future versions without breaking the migration path. Missing fields
 * are treated as `false` and the migration walks history records to
 * backfill them on first load.
 */
export interface IntroducedConcepts {
  /**
   * First time the user meets a pentascale in the curriculum — the
   * "what is this pattern" onboarding blurb (modal only; fingering
   * stays next to the score).
   */
  pentascalePattern?: boolean;
  /** Stages that omit the metronome ("free tempo, accuracy first"). */
  freeTempo?: boolean;
  /** Any stage with the click on, regardless of subdivision. */
  metronome?: boolean;
  /** Both-hands stages — even if individual hands have been seen. */
  handsTogether?: boolean;
  /** A click meaningfully faster than the slow-tempo onboarding speed. */
  moderateTempo?: boolean;
  /** First time muted-playback ("from memory") kicks in. */
  fromMemory?: boolean;
  /** First time a stage hits the per-exercise target tempo. */
  targetTempo?: boolean;
  /** First eighth-note subdivision stage. */
  eighthSubdivision?: boolean;
  /** First triplet subdivision stage. */
  triplets?: boolean;
  /** First sixteenth subdivision stage. */
  sixteenths?: boolean;
  /** First 2-octave stage (the 3-4-3 thumb-under pattern). */
  twoOctaves?: boolean;
  /**
   * First time a full scale (or arpeggio) is encountered. Distinct
   * from `freeTempo` because pentascales also use free tempo without
   * involving a thumb-under. Fires for any non-pentascale exercise.
   */
  thumbUnder?: boolean;
}

/**
 * Per-exercise per-hand flags populated by v2→v3 migration backfill
 * from practice history. Fingering and video links now always live
 * next to the score (not in the modal); this map is kept for forward
 * compatibility and migration round-trips.
 *
 * Stored as a partial map so unseen exercises take zero bytes in the
 * persisted blob.
 */
export interface IntroducedHands {
  right?: boolean;
  left?: boolean;
  both?: boolean;
}

export interface ScalesProgressData {
  version: 3;
  exercises: Record<string, ExerciseProgress>;
  /** The tier the user is currently working through. */
  currentTierId: string;
  /**
   * Whether the user has dismissed the first-time "How to practice"
   * onboarding overlay. Once true the overlay never auto-opens again
   * (the Home header still has a manual entry point for reference).
   *
   * Stored on `ScalesProgressData` so it persists alongside the
   * exercise history; we do NOT want this re-shown after a fresh
   * install if the user already has progress.
   *
   * Migrated forward from v1 by defaulting to `false` for users who
   * already had practice data — they'll see the overlay once the
   * next time they open a session, then never again. This keeps the
   * onboarding useful without surprising returning users with a
   * lost streak.
   */
  seenOnboarding: boolean;
  /**
   * Concept-level "have I shown this intro yet?" flags. Drives the
   * "New for you" onboarding modal (not fingering copy beside the score).
   */
  introducedConcepts: IntroducedConcepts;
  /**
   * Populated by v2→v3 migration from practice history. Fingering is
   * always shown next to the score; this field is retained for
   * round-trips and forward compatibility.
   */
  introducedExerciseHands: Record<string, IntroducedHands>;
}
