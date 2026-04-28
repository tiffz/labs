/**
 * Surfaces the session debug panel can open for QA (mirrors real copy where
 * possible). Names map to SessionScreen handlers.
 */
export type ScalesDebugHelpSurface =
  | 'guidance'
  | 'practice_tip'
  | 'shaky_timing'
  | 'shaky_pitch'
  | 'shaky_few_notes'
  | 'stuck_drill'
  | 'stuck_regular'
  | 'stuck_tip'
  | 'wrong_note'
  | 'drill_how_it_works';

export type ScalesSessionDebugApi = {
  /** Seed perfect per-note results and dispatch FINISH_EXERCISE (updates progress). */
  completeExercisePerfect: () => void;
  setHelpPreview: (surface: ScalesDebugHelpSurface | null) => void;
  clearHelpPreview: () => void;
};
