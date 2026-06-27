import type { ConceptKey } from '../curriculum/concepts';
import type { RunOutcomeTier } from '../progress/store';
import type { ExerciseResult } from '../store';

/** Drill = voluntary polish loop. Strict 100% required to keep the streak. */
export const DRILL_TARGET_PERFECT_RUNS = 3;
export const DRILL_STUCK_AT = 8;
export const DRILL_SNOOZE_BY = 4;
/** Regular auto-loop "Try going back?" — consecutive rough runs before prompt. */
export const REGULAR_STUCK_AT = 8;
/** Jump-coaching + stepping-stone modals only after this many finished attempts on the stage. */
export const REGULAR_STUCK_MIN_ATTEMPTS_FOR_JUMP = 4;
/** How long the free-tempo "Nice. ready to start" overlay stays before scored playback. */
export const FREE_TEMPO_WARMUP_UI_MS = 2200;

/** Sample cliff keys for debug preview of jump-coaching stuck copy. */
export const DEBUG_PREVIEW_JUMP_CONCEPT_KEYS: ConceptKey[] = ['thumbUnder'];

export const DEBUG_SHAKY_MOCK_TIMING: ExerciseResult = {
  accuracy: 0.5,
  correct: 5,
  total: 20,
  advanced: false,
  breakdown: { perfect: 5, early: 8, late: 5, wrongPitch: 0, missed: 2 },
};

export const DEBUG_SHAKY_MOCK_PITCH: ExerciseResult = {
  accuracy: 0.55,
  correct: 6,
  total: 20,
  advanced: false,
  breakdown: { perfect: 6, early: 1, late: 1, wrongPitch: 10, missed: 2 },
};

export const DEBUG_SHAKY_MOCK_FEW_NOTES: ExerciseResult = {
  accuracy: 0.2,
  correct: 2,
  total: 20,
  advanced: false,
  breakdown: { perfect: 2, early: 0, late: 0, wrongPitch: 0, missed: 18 },
};

/** Cached last auto-loop verdict so the chip can stay visible through metronome count-in. */
export type DwellBadgeSnapshot = {
  result: ExerciseResult;
  inDrill: boolean;
  drillStreak: number;
  cleanStreak: number;
  displayRunStreak: number;
  requiredRuns: number;
  practicingAdvancementStage: boolean;
  usesPerfectRegimen: boolean;
  overlearnUnlocked: boolean;
  lastWasClean: boolean;
  lastRunOutcomeTier: RunOutcomeTier;
};

/** Short labels for the header chip cluster. */
export const HAND_SHORT = { right: 'RH', left: 'LH', both: 'Both' } as const;
