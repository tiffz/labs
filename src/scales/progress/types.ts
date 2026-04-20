export interface PracticeRecord {
  exerciseId: string;
  stageId: string;
  timestamp: number;
  accuracy: number;
  /** Number of notes in the exercise */
  noteCount: number;
  /** Number of notes played correctly */
  correctCount: number;
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

export interface ScalesProgressData {
  version: 1;
  exercises: Record<string, ExerciseProgress>;
  /** The tier the user is currently working through. */
  currentTierId: string;
}
