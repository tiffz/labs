import type {
  ScalesProgressData,
  ExerciseProgress,
  PracticeRecord,
  IntroducedConcepts,
  IntroducedHands,
  StageMasteryState,
  PendingRegressNotice,
} from './types';
import { TIERS, findExercise } from '../curriculum/tiers';
import type {
  ExerciseDefinition,
  ExerciseKind,
  Stage,
  PracticeItem,
  ScalesCustomRoutine,
} from '../curriculum/types';
import { triggerConcepts } from '../curriculum/concepts';
import {
  getGuidedThresholdCriteria,
  resolveAdvancementRegimen,
  runMeetsPerfectBar,
  runMeetsGuidedThresholdBar,
  runOutcomeTier,
} from './advancementRegimen';

export {
  getGuidedThresholdCriteria,
  resolveAdvancementRegimen,
  runMeetsPerfectBar,
  runMeetsGuidedThresholdBar,
  runAdvancementOutcome,
  runQualifiesForAdvancement,
  runOutcomeTier,
  type AdvancementRegimen,
  type AdvancementRegimenKind,
  type RunAdvancementOutcome,
  type RunOutcomeTier,
} from './advancementRegimen';
import {
  isGuidedSubdivisionStage,
  isBeatOnlySubdivisionStage,
  redirectCurrentStageToGuidedScaffold,
  guidedStageIdForBeatOnly,
} from '../curriculum/guidedStages';

const STORAGE_KEY = 'scales-progress';
const MAX_HISTORY_PER_EXERCISE = 20;
const REVIEW_ACCURACY_THRESHOLD = 0.7;
const STALE_DAYS = 5;

/** Minimum consecutive perfect runs after first-perfect unlock. */
export const OVERLEARN_MIN_STREAK = 2;
/** Cap on required perfect streak (attempts to first perfect). */
export const OVERLEARN_MAX_STREAK = 5;
/** Auto-regress when this many attempts pass without any perfect run. */
export const OVERLEARN_REGRESS_WITHOUT_FIRST_PERFECT = 10;

const progressSaveListeners = new Set<() => void>();

/** Subscribe to local progress writes (for debounced Drive auto-push). */
export function subscribeScalesProgressSave(listener: () => void): () => void {
  progressSaveListeners.add(listener);
  return () => {
    progressSaveListeners.delete(listener);
  };
}

/**
 * Guided-threshold accuracy bar (subdivision scaffold stages only).
 * Timed beat-only stages advance via perfect-streak overlearning, not this threshold.
 */
export interface AdvancementCriteria {
  threshold: number;
  runs: number;
}

/**
 * Practice rows that count toward advancement streaks. Warmup and drill rows stay
 * in history for proficiency / migrations but must not satisfy the gate.
 */
function recordCountsTowardAdvancementStreak(record: PracticeRecord): boolean {
  return record.purpose !== 'drill' && record.purpose !== 'warmup';
}

/** True when practicing the stage the curriculum treats as "current" (can advance from here). */
export function isPracticingAdvancementStage(progress: ExerciseProgress, stageId: string): boolean {
  return progress.currentStageId === stageId;
}

/** Label for UI chips and dwell badge, e.g. `2/3` (never `11/3`). */
export function formatAdvancementCleanRunsLabel(streak: number, requiredRuns: number): string {
  if (requiredRuns <= 0) return String(Math.max(0, streak));
  const capped = Math.min(Math.max(0, streak), requiredRuns);
  return `${capped}/${requiredRuns}`;
}

/**
 * Dwell-toast subline: always surfaces **run** progress (never `16/18` notes).
 * `advancement` = streak toward unlocking the next level; `stage` = same cap
 * but copy clarifies this is the level being practiced, not curriculum headway.
 */
export function formatDwellCleanRunsSubline(
  percent: number,
  streak: number,
  requiredRuns: number,
  scope: 'advancement' | 'stage',
): string {
  const runs = formatAdvancementCleanRunsLabel(streak, requiredRuns);
  const suffix = scope === 'advancement' ? 'clean runs' : 'on this level';
  return `${percent}% · ${runs} ${suffix}`;
}

/** Label for overlearning UI chips, e.g. `2/4` perfect runs. */
export function formatAdvancementPerfectRunsLabel(streak: number, requiredRuns: number): string {
  return formatAdvancementCleanRunsLabel(streak, requiredRuns);
}

function latestAdvancementRecord(
  progress: ExerciseProgress,
  stageId: string,
): PracticeRecord | null {
  for (const entry of consecutiveStageRecords(progress.history, stageId)) {
    if (recordCountsTowardAdvancementStreak(entry)) return entry;
  }
  return null;
}

function emptyStageMastery(): StageMasteryState {
  return {
    attemptCount: 0,
    firstPerfectAtAttempt: null,
    requiredPerfectStreak: null,
    currentPerfectStreak: 0,
  };
}

export function getStageMasteryState(
  progress: ExerciseProgress,
  stageId: string,
): StageMasteryState {
  return progress.stageMastery?.[stageId] ?? emptyStageMastery();
}

/** Cap perfect streak on beat-only subdivision stages (overlearning lottery). */
export const SUBDIVISION_BEAT_ONLY_MAX_PERFECT_STREAK = 3;

function clampOverlearnStreak(attemptsToFirstPerfect: number, stage?: Stage): number {
  let streak = Math.min(
    OVERLEARN_MAX_STREAK,
    Math.max(OVERLEARN_MIN_STREAK, attemptsToFirstPerfect),
  );
  if (stage && isBeatOnlySubdivisionStage(stage)) {
    streak = Math.min(streak, SUBDIVISION_BEAT_ONLY_MAX_PERFECT_STREAK);
  }
  return streak;
}

export function shouldAutoRegressStage(mastery: StageMasteryState): boolean {
  return (
    mastery.firstPerfectAtAttempt == null
    && mastery.attemptCount >= OVERLEARN_REGRESS_WITHOUT_FIRST_PERFECT
  );
}

/**
 * Previous curriculum stage; from s12 prefers s11m when present.
 */
export function resolveRegressTargetStage(
  stages: readonly Stage[],
  currentIdx: number,
): Stage | null {
  if (currentIdx <= 0) return null;
  const current = stages[currentIdx];
  if (current && isBeatOnlySubdivisionStage(current)) {
    const guidedId = guidedStageIdForBeatOnly(current.id);
    if (guidedId) {
      const guided = stages.find(s => s.id === guidedId);
      if (guided) return guided;
    }
  }
  if (current?.id.endsWith('-s12')) {
    const moderate = stages.find(s => s.id.endsWith('-s11m'));
    if (moderate) return moderate;
  }
  if (current?.id.endsWith('-p8t')) {
    const guidedModerate = stages.find(s => s.id.endsWith('-p8tg'));
    if (guidedModerate) return guidedModerate;
  }
  return stages[currentIdx - 1] ?? null;
}

function applyMidInsertCurriculumRedirects(
  stages: readonly Stage[],
  completedStageId: string | null,
  currentStageId: string,
): string {
  let next = currentStageId;

  if (completedStageId != null) {
    if (
      next.endsWith('-s12')
      && completedStageId.endsWith('-s11')
      && !completedStageId.endsWith('-s11m')
      && !completedStageId.endsWith('-s11g')
      && stages.some(s => s.id.endsWith('-s11m'))
    ) {
      const moderate = stages.find(s => s.id.endsWith('-s11m'));
      if (moderate) return moderate.id;
    }
    if (
      next.endsWith('-p8t')
      && completedStageId.endsWith('-p8')
      && !completedStageId.endsWith('-p8e')
      && !completedStageId.endsWith('-p8g')
      && stages.some(s => s.id.endsWith('-p8tg'))
    ) {
      const guided = stages.find(s => s.id.endsWith('-p8tg'));
      if (guided) return guided.id;
    }
    if (
      next.endsWith('-p9')
      && completedStageId.endsWith('-p8')
      && !completedStageId.endsWith('-p8e')
      && !completedStageId.endsWith('-p8g')
      && stages.some(s => s.id.endsWith('-p8t'))
    ) {
      const moderate = stages.find(s => s.id.endsWith('-p8tg'))
        ?? stages.find(s => s.id.endsWith('-p8t'));
      if (moderate) return moderate.id;
    }
  }

  next = redirectCurrentStageToGuidedScaffold(stages, completedStageId, next);
  return next;
}

/**
 * Update overlearning counters after a meaningful run on the current stage.
 */
export function updateStageMasteryOnRecord(
  progress: ExerciseProgress,
  record: PracticeRecord,
  stageId: string,
): { stageMastery: Record<string, StageMasteryState>; shouldRegress: boolean } {
  const prev = getStageMasteryState(progress, stageId);
  const isPerfect = runMeetsPerfectBar(record);
  const attemptCount = prev.attemptCount + 1;

  let firstPerfectAtAttempt = prev.firstPerfectAtAttempt;
  let requiredPerfectStreak = prev.requiredPerfectStreak;
  let currentPerfectStreak = prev.currentPerfectStreak;

  if (isPerfect) {
    if (firstPerfectAtAttempt == null) {
      firstPerfectAtAttempt = attemptCount;
      const found = findExercise(progress.exerciseId);
      const stage = found?.exercise.stages.find(s => s.id === stageId);
      requiredPerfectStreak = clampOverlearnStreak(attemptCount, stage);
      currentPerfectStreak = 1;
    } else {
      currentPerfectStreak = prev.currentPerfectStreak + 1;
    }
  } else if (firstPerfectAtAttempt != null) {
    currentPerfectStreak = 0;
  }

  const next: StageMasteryState = {
    attemptCount,
    firstPerfectAtAttempt,
    requiredPerfectStreak,
    currentPerfectStreak,
  };

  const stageMastery = {
    ...(progress.stageMastery ?? {}),
    [stageId]: next,
  };

  return {
    stageMastery,
    shouldRegress: shouldAutoRegressStage(next),
  };
}

export function clearPendingRegressNotice(
  data: ScalesProgressData,
  exerciseId: string,
): ScalesProgressData {
  const ep = data.exercises[exerciseId];
  if (!ep?.pendingRegressNotice) return data;
  const rest = { ...ep };
  delete rest.pendingRegressNotice;
  return {
    ...data,
    exercises: {
      ...data.exercises,
      [exerciseId]: rest,
    },
  };
}

export function getOverlearningUiState(
  progress: ExerciseProgress,
  stageId: string,
): {
  attemptCount: number;
  requiredPerfectStreak: number | null;
  perfectStreak: number;
  unlocked: boolean;
} {
  const mastery = getStageMasteryState(progress, stageId);
  return {
    attemptCount: mastery.attemptCount,
    requiredPerfectStreak: mastery.requiredPerfectStreak,
    perfectStreak: mastery.requiredPerfectStreak != null ? mastery.currentPerfectStreak : 0,
    unlocked: mastery.requiredPerfectStreak != null,
  };
}

export function formatDwellPerfectRunsSubline(
  percent: number,
  streak: number,
  requiredRuns: number,
  scope: 'advancement' | 'stage',
): string {
  const runs = formatAdvancementPerfectRunsLabel(streak, requiredRuns);
  const suffix = scope === 'advancement' ? 'perfect runs' : 'on this level';
  return `${percent}% · ${runs} ${suffix}`;
}

export function getAdvancementCriteria(
  stage: Stage,
  isFinalStage: boolean = false,
  exerciseKind?: ExerciseKind,
): AdvancementCriteria {
  return getGuidedThresholdCriteria(stage, isFinalStage, exerciseKind);
}

/** @deprecated Use {@link runMeetsGuidedThresholdBar} with {@link resolveAdvancementRegimen}. */
export function runMeetsCleanBar(
  record: PracticeRecord,
  exerciseKind: ExerciseKind,
  stage: Stage,
  isFinalStage: boolean,
): boolean {
  const regimen = resolveAdvancementRegimen(stage, isFinalStage, exerciseKind);
  if (regimen.kind !== 'guided-threshold') return false;
  return runMeetsGuidedThresholdBar(record, regimen, exerciseKind, stage, isFinalStage);
}

/**
 * Walks {@link ExerciseProgress.history} (newest first) for rows on
 * {@link stageId}, skipping drill-only rows, and counts how many consecutive
 * runs rate as {@link RunOutcomeTier} `'rough'` from the most recent attempt.
 */
export function consecutiveRoughRunsOnStage(
  history: readonly PracticeRecord[],
  stageId: string,
  exerciseKind: ExerciseKind,
  stage: Stage,
  isFinalStage: boolean,
): number {
  let n = 0;
  for (const r of history) {
    if (r.stageId !== stageId) continue;
    if (r.purpose === 'drill') break;
    if (runOutcomeTier(r, exerciseKind, stage, isFinalStage) === 'rough') n += 1;
    else break;
  }
  return n;
}

/**
 * Newest-first history prefix of attempts on {@link stageId} until the
 * learner practiced a different stage (session order). Matches how a
 * "streak on this level" should behave when they dip into another stage
 * between tries — older same-stage rows after that gap do not count.
 */
export function consecutiveStageRecords(
  history: readonly PracticeRecord[],
  stageId: string,
): PracticeRecord[] {
  const out: PracticeRecord[] = [];
  for (const r of history) {
    if (r.stageId !== stageId) {
      if (out.length > 0) break;
      continue;
    }
    out.push(r);
  }
  return out;
}

/**
 * Count of consecutive runs that {@link runMeetsCleanBar} accepts on the
 * given stage, walking backwards from the most recent attempt on that
 * stage only (see {@link consecutiveStageRecords}).
 */
export function getCleanRunStreak(
  progress: ExerciseProgress,
  stageId: string,
): number {
  const found = findExercise(progress.exerciseId);
  const stages = found?.exercise.stages ?? [];
  const stage = stages.find(s => s.id === stageId);
  if (!found || !stage) return 0;
  const stageIndex = stages.findIndex(s => s.id === stageId);
  const isFinalStage = stageIndex >= 0 && stageIndex === stages.length - 1;

  let streak = 0;
  const regimen = resolveAdvancementRegimen(stage, isFinalStage, found.exercise.kind);
  if (regimen.kind !== 'guided-threshold') return 0;
  for (const record of consecutiveStageRecords(progress.history, stageId)) {
    if (!recordCountsTowardAdvancementStreak(record)) continue;
    if (runMeetsGuidedThresholdBar(record, regimen, found.exercise.kind, stage, isFinalStage)) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Structured review entry returned from {@link getReviewExercises}. Includes
 * the specific stage to target on the next session — for shaky runs this is
 * the stage that scored low, for stale entries it's the stage the user
 * would naturally practice next.
 */
export interface ReviewEntry {
  exerciseId: string;
  stageId: string;
  reason: 'shaky' | 'stale';
}

function defaultProgress(): ScalesProgressData {
  return {
    version: 5,
    exercises: {},
    currentTierId: TIERS[0].id,
    seenOnboarding: false,
    introducedConcepts: {},
    introducedExerciseHands: {},
    customRoutines: [],
    progressUpdatedAt: new Date().toISOString(),
  };
}

/**
 * Structural validation for a persisted practice item. Guards the loader
 * against corrupted / hand-edited localStorage by dropping structurally
 * malformed items (which could crash score generation). Semantic validity —
 * whether a well-formed item's score actually generates in this app version —
 * is enforced later by the `START_ROUTINE` / `START_FREE_PRACTICE` reducer
 * guards, so a routine synced from a newer version is not silently discarded
 * here; it just skips the items this build cannot render.
 */
function isStructurallyValidPracticeItem(it: unknown): it is PracticeItem {
  if (!it || typeof it !== 'object') return false;
  const p = it as Partial<PracticeItem>;
  return (
    typeof p.kind === 'string'
    && typeof p.key === 'string'
    && (p.hand === 'right' || p.hand === 'left' || p.hand === 'both')
    && (p.octaves === 1 || p.octaves === 2)
    && typeof p.bpm === 'number'
    && Number.isFinite(p.bpm)
    && typeof p.subdivision === 'string'
  );
}

/**
 * Defensive normalizer for the persisted `customRoutines` array. A corrupted
 * or partial blob must never crash the loader, so malformed routines and items
 * are dropped rather than trusted.
 */
function sanitizeCustomRoutines(raw: unknown): ScalesCustomRoutine[] {
  if (!Array.isArray(raw)) return [];
  const result: ScalesCustomRoutine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const r = entry as Partial<ScalesCustomRoutine>;
    if (typeof r.id !== 'string' || typeof r.name !== 'string') continue;
    if (!Array.isArray(r.items)) continue;
    result.push({
      id: r.id,
      name: r.name,
      updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date(0).toISOString(),
      items: r.items.filter(isStructurallyValidPracticeItem),
    });
  }
  return result;
}

/** Validate the tombstone map (routine id → ISO deletion time). */
function sanitizeDeletedRoutineIds(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [id, ts] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof ts === 'string') out[id] = ts;
  }
  return out;
}

function defaultProgressUpdatedAt(data: {
  exercises: Record<string, ExerciseProgress>;
}): string {
  let maxTs = 0;
  for (const ep of Object.values(data.exercises)) {
    for (const r of ep.history) {
      maxTs = Math.max(maxTs, r.timestamp);
    }
    if (ep.lastPracticedAt) {
      const t = Date.parse(ep.lastPracticedAt);
      if (Number.isFinite(t)) maxTs = Math.max(maxTs, t);
    }
  }
  return maxTs > 0 ? new Date(maxTs).toISOString() : new Date().toISOString();
}

/** Migrate, reconcile, and ensure progressUpdatedAt for Drive merge / restore paths. */
export function normalizeScalesProgressPayload(raw: unknown): ScalesProgressData {
  if (raw && typeof raw === 'object' && 'version' in raw) {
    const migrated = migrateProgress(raw);
    if (migrated) {
      return reconcileProgressToCurriculum({
        ...migrated,
        progressUpdatedAt: migrated.progressUpdatedAt ?? defaultProgressUpdatedAt(migrated),
      });
    }
  }
  return reconcileProgressToCurriculum(defaultProgress());
}

/**
 * Walk every history record on the supplied `exercises` map and
 * derive the concept and per-exercise per-hand introduction flags.
 * Used by the v2 → v3 migration so returning users don't see callouts
 * for content they've already worked through.
 *
 * Records on stages or exercises that no longer exist are skipped —
 * this is forward-compat against curriculum churn.
 */
function backfillIntroductions(
  exercises: Record<string, ExerciseProgress>,
): {
  introducedConcepts: IntroducedConcepts;
  introducedExerciseHands: Record<string, IntroducedHands>;
} {
  const concepts: IntroducedConcepts = {};
  const exerciseHands: Record<string, IntroducedHands> = {};

  for (const [exerciseId, progress] of Object.entries(exercises)) {
    if (!progress || !Array.isArray(progress.history)) continue;
    const found = findExercise(exerciseId);
    if (!found) continue;
    const exercise = found.exercise;

    for (const record of progress.history) {
      const stage = exercise.stages.find(s => s.id === record.stageId);
      if (!stage) continue;

      for (const concept of triggerConcepts(stage, exercise)) {
        concepts[concept] = true;
      }
      const hands = exerciseHands[exerciseId] ?? {};
      hands[stage.hand] = true;
      exerciseHands[exerciseId] = hands;
    }
  }

  return { introducedConcepts: concepts, introducedExerciseHands: exerciseHands };
}

/**
 * Forward-compat migration of older `ScalesProgressData` shapes. Each step
 * is responsible for transforming version N into version N+1; new versions
 * append a step here rather than rewriting the loader.
 *
 * Why migrate rather than wipe:
 *   - Practice history is the single most valuable thing on this app.
 *     Wiping it on a schema bump (the previous behavior, where any
 *     unknown version returned a fresh blank) silently destroyed the
 *     user's streak across rolls.
 *   - Any new field added to `ScalesProgressData` should default to a
 *     value that preserves the prior behavior for returning users.
 *
 * Returns null only when the input is unrecognizable (corrupted JSON,
 * missing required fields, or a version newer than this build knows about).
 */
function migrateProgress(raw: unknown): ScalesProgressData | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as {
    version?: unknown;
    currentTierId?: unknown;
    exercises?: unknown;
    seenOnboarding?: unknown;
    introducedConcepts?: unknown;
    introducedExerciseHands?: unknown;
    customRoutines?: unknown;
    deletedRoutineIds?: unknown;
    lastFreePracticeParams?: unknown;
    recentPracticeItems?: unknown;
  };
  if (typeof data.version !== 'number') return null;
  if (typeof data.currentTierId !== 'string') return null;
  if (!data.exercises || typeof data.exercises !== 'object') return null;

  const exercises = data.exercises as Record<string, ExerciseProgress>;
  const currentTierId = data.currentTierId;

  // v1 had no onboarding flag and no introduction flags — fold both
  // forward through the v2 step so the v3 backfill below sees the
  // same shape regardless of starting version.
  if (data.version === 1) {
    const v2: ScalesProgressData = {
      ...defaultProgress(),
      exercises,
      currentTierId,
      // seenOnboarding stays false: v1 users predate the onboarding
      // overlay, so they should see it once on their next session.
      seenOnboarding: false,
    };
    const { introducedConcepts, introducedExerciseHands } = backfillIntroductions(exercises);
    return {
      ...v2,
      version: 5,
      introducedConcepts,
      introducedExerciseHands,
      customRoutines: [],
      exercises: Object.fromEntries(
        Object.entries(exercises).map(([id, ep]) => [
          id,
          { ...ep, stageMastery: ep.stageMastery ?? {} },
        ]),
      ),
    };
  }
  if (data.version === 2) {
    const { introducedConcepts, introducedExerciseHands } = backfillIntroductions(exercises);
    return {
      version: 5,
      exercises: Object.fromEntries(
        Object.entries(exercises).map(([id, ep]) => [
          id,
          { ...ep, stageMastery: ep.stageMastery ?? {} },
        ]),
      ),
      currentTierId,
      seenOnboarding: data.seenOnboarding === true,
      introducedConcepts,
      introducedExerciseHands,
      customRoutines: [],
    };
  }
  if (data.version === 3) {
    // Already current. Re-validate the introduction maps so a corrupted
    // or partial v3 blob doesn't leak `undefined` into the runtime.
    const introducedConcepts =
      data.introducedConcepts && typeof data.introducedConcepts === 'object'
        ? (data.introducedConcepts as IntroducedConcepts)
        : {};
    const introducedExerciseHands =
      data.introducedExerciseHands && typeof data.introducedExerciseHands === 'object'
        ? (data.introducedExerciseHands as Record<string, IntroducedHands>)
        : {};
    const v3Base = {
      version: 3 as const,
      exercises,
      currentTierId,
      seenOnboarding: data.seenOnboarding === true,
      introducedConcepts,
      introducedExerciseHands,
    };
    const v3: ScalesProgressData = {
      ...v3Base,
      version: 5,
      customRoutines: [],
      progressUpdatedAt:
        typeof (data as { progressUpdatedAt?: unknown }).progressUpdatedAt === 'string'
          ? (data as { progressUpdatedAt: string }).progressUpdatedAt
          : defaultProgressUpdatedAt({ exercises }),
      exercises: Object.fromEntries(
        Object.entries(exercises).map(([id, ep]) => [
          id,
          {
            ...ep,
            stageMastery: ep.stageMastery ?? {},
          },
        ]),
      ),
    };
    return v3;
  }
  if (data.version === 4 || data.version === 5) {
    // v4 and v5 share the same exercise/onboarding shape; v5 adds
    // `customRoutines` + `lastFreePracticeParams`. A v4 blob has neither
    // (defaults to an empty routine list, no last params) — a lossless
    // upgrade. A v5 blob carries them through, sanitized.
    const introducedConcepts =
      data.introducedConcepts && typeof data.introducedConcepts === 'object'
        ? (data.introducedConcepts as IntroducedConcepts)
        : {};
    const introducedExerciseHands =
      data.introducedExerciseHands && typeof data.introducedExerciseHands === 'object'
        ? (data.introducedExerciseHands as Record<string, IntroducedHands>)
        : {};
    const base: ScalesProgressData = {
      version: 5 as const,
      exercises: Object.fromEntries(
        Object.entries(exercises).map(([id, ep]) => [
          id,
          {
            ...ep,
            stageMastery: ep.stageMastery ?? {},
          },
        ]),
      ),
      currentTierId,
      seenOnboarding: data.seenOnboarding === true,
      introducedConcepts,
      introducedExerciseHands,
      customRoutines: sanitizeCustomRoutines(data.customRoutines),
      deletedRoutineIds: sanitizeDeletedRoutineIds(data.deletedRoutineIds),
      lastFreePracticeParams:
        data.lastFreePracticeParams && typeof data.lastFreePracticeParams === 'object'
          ? (data.lastFreePracticeParams as PracticeItem)
          : undefined,
      recentPracticeItems: Array.isArray(data.recentPracticeItems)
        ? data.recentPracticeItems.filter(isStructurallyValidPracticeItem)
        : undefined,
    };
    return {
      ...base,
      progressUpdatedAt:
        typeof (data as { progressUpdatedAt?: unknown }).progressUpdatedAt === 'string'
          ? (data as { progressUpdatedAt: string }).progressUpdatedAt
          : defaultProgressUpdatedAt(base),
    };
  }
  return null;
}

/**
 * Mark the practice onboarding as seen. Idempotent — repeated calls are
 * cheap. Persists immediately so a refresh after dismiss doesn't re-open
 * the modal.
 */
export function markOnboardingSeen(data: ScalesProgressData): ScalesProgressData {
  if (data.seenOnboarding) return data;
  return { ...data, seenOnboarding: true };
}

// --- Custom routines (Free Practice / My Routines) --------------------------
//
// Routines live alongside curriculum progress but are fully independent of it:
// none of these helpers touch `exercises`, `currentTierId`, or unlock state.
// Each returns a new immutable `ScalesProgressData` (same pattern as
// `markOnboardingSeen`); the caller persists via `saveProgress`.

/** Read the routine list, tolerating pre-v5 data that never set the field. */
export function getCustomRoutines(data: ScalesProgressData): ScalesCustomRoutine[] {
  return data.customRoutines ?? [];
}

/**
 * Insert or replace a routine by id (upsert), stamping `updatedAt` to `now`
 * so Drive's last-writer-wins merge resolves correctly. `now` is injected so
 * tests stay deterministic.
 */
export function saveRoutine(
  data: ScalesProgressData,
  routine: ScalesCustomRoutine,
  now: string = new Date().toISOString(),
): ScalesProgressData {
  const stamped = { ...routine, updatedAt: now };
  const existing = getCustomRoutines(data);
  const idx = existing.findIndex(r => r.id === routine.id);
  const customRoutines =
    idx >= 0
      ? existing.map((r, i) => (i === idx ? stamped : r))
      : [...existing, stamped];
  // Re-creating an id supersedes any prior deletion tombstone for it.
  const deletedRoutineIds = { ...(data.deletedRoutineIds ?? {}) };
  delete deletedRoutineIds[routine.id];
  return { ...data, customRoutines, deletedRoutineIds };
}

/**
 * Remove a routine by id and record a tombstone so a delete on this device is
 * not resurrected by a Drive pull that still lists it. No-op (same reference)
 * when the id is neither present nor already tombstoned.
 */
export function deleteRoutine(
  data: ScalesProgressData,
  id: string,
  now: string = new Date().toISOString(),
): ScalesProgressData {
  const existing = getCustomRoutines(data);
  // The UI only deletes a routine the user can see, so a not-present id is a
  // pure no-op — do not mint a tombstone for something that was never here.
  if (!existing.some(r => r.id === id)) return data;
  return {
    ...data,
    customRoutines: existing.filter(r => r.id !== id),
    deletedRoutineIds: { ...(data.deletedRoutineIds ?? {}), [id]: now },
  };
}

/** Remember the last free-practice picker selection (device-local scratch). */
export function setLastFreePracticeParams(
  data: ScalesProgressData,
  params: PracticeItem,
): ScalesProgressData {
  return { ...data, lastFreePracticeParams: params };
}

const MAX_RECENT_PRACTICE_ITEMS = 6;

/** Stable identity for de-duplicating recents (all params that make a distinct drill). */
function practiceItemKey(item: PracticeItem): string {
  return [item.kind, item.key, item.hand, item.octaves, item.bpm, item.subdivision].join('|');
}

export function getRecentPracticeItems(data: ScalesProgressData): PracticeItem[] {
  return data.recentPracticeItems ?? [];
}

/**
 * Record a just-started free-practice item at the front of the recents list,
 * de-duplicated and capped. Device-local scratch.
 */
export function pushRecentPracticeItem(
  data: ScalesProgressData,
  item: PracticeItem,
): ScalesProgressData {
  const key = practiceItemKey(item);
  const rest = getRecentPracticeItems(data).filter(it => practiceItemKey(it) !== key);
  return { ...data, recentPracticeItems: [item, ...rest].slice(0, MAX_RECENT_PRACTICE_ITEMS) };
}

/**
 * Persist the contextual-guidance flags for the supplied stage and
 * exercise. Idempotent — repeated calls return the same data reference
 * when nothing changed, so dispatching this on every render or both
 * the dismiss and run-start paths is cheap.
 *
 * The session screen calls this:
 *   - When the user clicks "Got it" on the GuidanceCallout.
 *   - On run start, regardless of whether the callout was dismissed —
 *     a user who just hits Play should still have their flags
 *     advanced, otherwise the callout would re-appear on the next
 *     render.
 *
 * Only **concept** flags are flipped (modal one-shots). Fingering and
 * video links are not tracked here — they stay beside the score.
 */
export function markGuidanceIntroduced(
  data: ScalesProgressData,
  stage: Stage,
  exercise: ExerciseDefinition,
): ScalesProgressData {
  const triggered = triggerConcepts(stage, exercise);

  let conceptsChanged = false;
  const newConcepts: IntroducedConcepts = { ...data.introducedConcepts };
  for (const key of triggered) {
    if (!newConcepts[key]) {
      newConcepts[key] = true;
      conceptsChanged = true;
    }
  }

  if (!conceptsChanged) return data;

  return {
    ...data,
    introducedConcepts: newConcepts,
  };
}

export function saveProgress(data: ScalesProgressData): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...data, progressUpdatedAt: new Date().toISOString() }),
  );
  for (const listener of progressSaveListeners) {
    listener();
  }
}

/**
 * When new stages are **appended** after a former final stage, returning
 * users can still have `currentStageId === completedStageId` on the old
 * final row. Bump `currentStageId` to the first new stage so `planSession`
 * and the UI surface catch-up work. Invalid ids (removed curriculum rows)
 * are repaired conservatively. Persists when anything changes so the
 * nudge survives refresh without waiting for the next `recordPractice`.
 */
export function reconcileProgressToCurriculum(data: ScalesProgressData): ScalesProgressData {
  const nextExercises = { ...data.exercises };
  let dirty = false;

  for (const [exerciseId, progress] of Object.entries(nextExercises)) {
    const found = findExercise(exerciseId);
    if (!found) continue;
    const stages = found.exercise.stages;
    if (stages.length === 0) continue;

    const idValid = (id: string | null) =>
      id != null && stages.some(s => s.id === id);

    let completedStageId = progress.completedStageId;
    let currentStageId = progress.currentStageId;

    if (!idValid(completedStageId)) {
      if (completedStageId != null) dirty = true;
      completedStageId = null;
    }
    if (!idValid(currentStageId)) {
      dirty = true;
      currentStageId = stages[0].id;
    }

    const redirected = applyMidInsertCurriculumRedirects(
      stages,
      completedStageId,
      currentStageId,
    );
    if (redirected !== currentStageId) {
      currentStageId = redirected;
      dirty = true;
    }

    const compIdx = completedStageId != null
      ? stages.findIndex(s => s.id === completedStageId)
      : -1;
    if (
      completedStageId != null
      && currentStageId === completedStageId
      && compIdx >= 0
      && compIdx < stages.length - 1
    ) {
      currentStageId = stages[compIdx + 1]!.id;
      dirty = true;
    }

    nextExercises[exerciseId] = {
      ...progress,
      completedStageId,
      currentStageId,
    };
  }

  const out = { ...data, exercises: nextExercises };
  if (dirty) {
    saveProgress(out);
  }
  return out;
}

export function loadProgress(): ScalesProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return reconcileProgressToCurriculum(defaultProgress());
    const parsed = JSON.parse(raw);
    const migrated = migrateProgress(parsed);
    return reconcileProgressToCurriculum(migrated ?? defaultProgress());
  } catch {
    return reconcileProgressToCurriculum(defaultProgress());
  }
}

export function getExerciseProgress(
  data: ScalesProgressData,
  exerciseId: string,
): ExerciseProgress {
  if (data.exercises[exerciseId]) {
    return data.exercises[exerciseId];
  }
  const found = findExercise(exerciseId);
  const firstStageId = found?.exercise.stages[0]?.id ?? '';
  return {
    exerciseId,
    completedStageId: null,
    currentStageId: firstStageId,
    history: [],
    needsReview: false,
    reviewStageId: null,
    lastPracticedAt: null,
    stageMastery: {},
  };
}

/**
 * Whether an exercise has gone stale enough that a refresher is appropriate.
 * Only counts against exercises the user has actually completed at least
 * one stage of — otherwise "stale" would fire for keys the user has never
 * touched.
 */
export function isStale(progress: ExerciseProgress): boolean {
  if (!progress.lastPracticedAt || !progress.completedStageId) return false;
  const daysSince = (Date.now() - new Date(progress.lastPracticedAt).getTime()) /
    (1000 * 60 * 60 * 24);
  return daysSince > STALE_DAYS;
}

export type MasteryTier = 'learning' | 'fluent' | 'mastered';

/**
 * Compute the mastery tier for an exercise based on how far the learner
 * has progressed and whether the exercise is currently "live" (not shaky,
 * not stale). The result is derived on every render — nothing is stored —
 * so a shaky run or a long absence automatically demotes "Mastered" back
 * to "Fluent" without any write path, which keeps the invariant "Mastered
 * cannot coexist with Due for review" trivially true.
 *
 * Thresholds:
 *   - `learning` → user hasn't yet passed the designated fluent checkpoint
 *   - `fluent`   → passed the fluent checkpoint, OR passed the final stage
 *                  but currently shaky/stale (demoted from `mastered`)
 *   - `mastered` → passed the final stage AND not shaky AND not stale
 */
export function getMasteryTier(
  progress: ExerciseProgress,
  exercise: ExerciseDefinition,
): MasteryTier {
  const stages = exercise.stages;
  const completedIdx = progress.completedStageId
    ? stages.findIndex(s => s.id === progress.completedStageId)
    : -1;
  // Fluent checkpoint is wherever curriculum authors marked it. If no
  // stage is explicitly marked, fall back to the second-to-last stage,
  // treating the final stage as the mastery gate and everything before it
  // as fluent — better than hard-failing when curriculum is incomplete.
  const explicitFluentIdx = stages.findIndex(s => s.kind === 'fluent-checkpoint');
  const fluentIdx = explicitFluentIdx >= 0
    ? explicitFluentIdx
    : Math.max(0, stages.length - 2);
  const lastIdx = stages.length - 1;

  if (completedIdx < fluentIdx) return 'learning';
  if (completedIdx < lastIdx) return 'fluent';
  if (progress.needsReview || isStale(progress)) return 'fluent';
  return 'mastered';
}

function levelsDoneFromCompletedStage(
  ep: ExerciseProgress,
  ex: ExerciseDefinition,
): number {
  const completedIdx = ep.completedStageId
    ? ex.stages.findIndex(s => s.id === ep.completedStageId)
    : -1;
  return completedIdx + 1;
}

/**
 * Tier-0 major pentascale for the same key as a full major-scale exercise,
 * when it exists in the curriculum.
 */
export function findPentascaleMajorSibling(
  majorExercise: ExerciseDefinition,
): ExerciseDefinition | null {
  if (majorExercise.kind !== 'major-scale') return null;
  const id = `${majorExercise.key}-pentascale-major`;
  const found = findExercise(id);
  return found?.exercise ?? null;
}

/**
 * Pentascale major is the first leg of learning that key's major scale.
 * Combines cleared levels and tier for progress surfaces (home fluency,
 * mastery dialog, progress chips).
 *
 * - `levelsDone` / `totalLevels` sum pentascale + full-scale stages (capped).
 * - `tier`: full-scale fluent/mastered wins; otherwise pentascale fluent or
 *   mastered surfaces as **fluent** on the combined card (pentascale alone
 *   never shows as **mastered** until the full scale is mastered).
 */
export function getCombinedMajorScaleMastery(
  data: ScalesProgressData,
  majorExercise: ExerciseDefinition,
): {
  tier: MasteryTier;
  levelsDone: number;
  totalLevels: number;
  started: boolean;
} {
  const majorEp = getExerciseProgress(data, majorExercise.id);
  const majorLd = levelsDoneFromCompletedStage(majorEp, majorExercise);
  const pentaEx = findPentascaleMajorSibling(majorExercise);
  if (!pentaEx) {
    return {
      tier: getMasteryTier(majorEp, majorExercise),
      levelsDone: majorLd,
      totalLevels: majorExercise.stages.length,
      started: majorLd > 0,
    };
  }
  const pentaEp = getExerciseProgress(data, pentaEx.id);
  const pentaLd = levelsDoneFromCompletedStage(pentaEp, pentaEx);
  const totalLevels = pentaEx.stages.length + majorExercise.stages.length;
  const levelsDone = Math.min(totalLevels, pentaLd + majorLd);
  const majorTier = getMasteryTier(majorEp, majorExercise);
  let tier: MasteryTier;
  if (majorTier === 'mastered') tier = 'mastered';
  else if (majorTier === 'fluent') tier = 'fluent';
  else {
    const pentaTier = getMasteryTier(pentaEp, pentaEx);
    tier = pentaTier === 'mastered' || pentaTier === 'fluent' ? 'fluent' : 'learning';
  }
  const started = pentaLd > 0
    || majorLd > 0
    || pentaEp.history.length > 0
    || majorEp.history.length > 0;
  return { tier, levelsDone, totalLevels, started };
}

/**
 * Major pentascales are folded into their key's major-scale mastery row;
 * skip them in whole-library mastered counts so we do not double-count.
 */
export function exerciseContributesToGlobalMasteryTotals(
  ex: ExerciseDefinition,
): boolean {
  if (ex.kind !== 'pentascale-major') return true;
  return findExercise(`${ex.key}-major-scale`) == null;
}

/**
 * True when the newest run on {@link stageId} satisfies that stage's advancement
 * regimen (guided-threshold streak or perfect-streak overlearning).
 */
export function stageAdvancementGateMet(
  progress: ExerciseProgress,
  stageId: string,
  exerciseKind: ExerciseKind,
  stage: Stage,
  isFinalStage: boolean,
): boolean {
  const latest = latestAdvancementRecord(progress, stageId);
  if (!latest) return false;

  if (isGuidedSubdivisionStage(stage)) {
    const { runs } = getAdvancementCriteria(stage, isFinalStage, exerciseKind);
    if (getCleanRunStreak(progress, stageId) < runs) return false;
    return runMeetsCleanBar(latest, exerciseKind, stage, isFinalStage);
  }

  const mastery = getStageMasteryState(progress, stageId);
  if (mastery.requiredPerfectStreak == null) return false;
  if (mastery.currentPerfectStreak < mastery.requiredPerfectStreak) return false;
  return runMeetsPerfectBar(latest);
}

/**
 * Record a practice result and evaluate whether the user should advance.
 */
export function recordPractice(
  data: ScalesProgressData,
  record: PracticeRecord,
): ScalesProgressData {
  const progress = getExerciseProgress(data, record.exerciseId);
  const updatedHistory = [record, ...progress.history].slice(0, MAX_HISTORY_PER_EXERCISE);

  const found = findExercise(record.exerciseId);
  let newCompletedStageId = progress.completedStageId;
  let newCurrentStageId = progress.currentStageId;
  let stageMastery = progress.stageMastery ?? {};
  let pendingRegressNotice: PendingRegressNotice | null | undefined =
    progress.pendingRegressNotice ?? null;

  const progressAfterRecord: ExerciseProgress = {
    ...progress,
    history: updatedHistory,
  };

  if (found && recordCountsTowardAdvancementStreak(record)) {
    if (record.stageId !== progress.currentStageId) {
      const currentId = progress.currentStageId;
      const currentMastery = getStageMasteryState(
        { ...progressAfterRecord, stageMastery },
        currentId,
      );
      if (currentMastery.requiredPerfectStreak != null && currentMastery.currentPerfectStreak > 0) {
        stageMastery = {
          ...stageMastery,
          [currentId]: {
            ...currentMastery,
            currentPerfectStreak: 0,
          },
        };
      }
    }

    const masteryUpdate = updateStageMasteryOnRecord(
      { ...progressAfterRecord, stageMastery },
      record,
      record.stageId,
    );
    stageMastery = masteryUpdate.stageMastery;

    if (record.stageId === progress.currentStageId) {
      const stages = found.exercise.stages;
      const currentIdx = stages.findIndex(s => s.id === record.stageId);
      const stage = currentIdx >= 0 ? stages[currentIdx] : null;

      if (stage && masteryUpdate.shouldRegress && currentIdx > 0) {
        const target = resolveRegressTargetStage(stages, currentIdx);
        if (target) {
          pendingRegressNotice = {
            fromStageId: record.stageId,
            toStageId: target.id,
          };
          newCurrentStageId = target.id;
          stageMastery = { ...stageMastery };
          delete stageMastery[record.stageId];
        }
      } else if (stage) {
        const isFinalStage = currentIdx === stages.length - 1;
        const withMastery: ExerciseProgress = {
          ...progressAfterRecord,
          stageMastery,
        };
        if (
          stageAdvancementGateMet(
            withMastery,
            record.stageId,
            found.exercise.kind,
            stage,
            isFinalStage,
          )
        ) {
          newCompletedStageId = record.stageId;
          if (currentIdx >= 0 && currentIdx < stages.length - 1) {
            newCurrentStageId = stages[currentIdx + 1]!.id;
          }
          stageMastery = { ...stageMastery };
          delete stageMastery[record.stageId];
          pendingRegressNotice = null;
        }
      }
    }
  }

  // Review lifecycle:
  //   - A shaky run (<70%) sets the flag AND pins reviewStageId to the
  //     specific stage that struggled. This is what the review dialog
  //     shows the user and what the session planner serves next.
  //   - A non-shaky run on the previously flagged stage clears both — the
  //     user's refreshed it successfully. Runs on *other* stages leave the
  //     flag alone so the reminder sticks until the shaky stage itself is
  //     re-played.
  //   - Drill records sidestep both directions: a shaky drill run does not
  //     queue a review (voluntary polishing must never demote mastery on a
  //     single off run), and a clean drill run does not clear an existing
  //     review flag (review is about regular practice). Drill records still
  //     get appended to history so getExerciseProficiency keeps working.
  const isShaky = record.accuracy < REVIEW_ACCURACY_THRESHOLD;
  let needsReview: boolean;
  let reviewStageId: string | null;
  if (record.purpose === 'drill') {
    needsReview = progress.needsReview;
    reviewStageId = progress.reviewStageId;
  } else if (isShaky) {
    needsReview = true;
    reviewStageId = record.stageId;
  } else if (progress.reviewStageId && progress.reviewStageId === record.stageId) {
    needsReview = false;
    reviewStageId = null;
  } else {
    needsReview = progress.needsReview;
    reviewStageId = progress.reviewStageId;
  }

  const updatedProgress: ExerciseProgress = {
    ...progress,
    completedStageId: newCompletedStageId,
    currentStageId: newCurrentStageId,
    history: updatedHistory,
    needsReview,
    reviewStageId,
    lastPracticedAt: new Date(record.timestamp).toISOString(),
    stageMastery,
    ...(pendingRegressNotice != null ? { pendingRegressNotice } : {}),
  };

  const newExercises = { ...data.exercises, [record.exerciseId]: updatedProgress };

  let newTierId = data.currentTierId;
  const currentTier = TIERS.find(t => t.id === data.currentTierId);
  if (currentTier) {
    const allComplete = currentTier.exercises.every(ex => {
      const ep = newExercises[ex.id];
      if (!ep) return false;
      const lastStage = ex.stages[ex.stages.length - 1];
      return ep.completedStageId === lastStage?.id;
    });
    if (allComplete) {
      const tierIdx = TIERS.findIndex(t => t.id === data.currentTierId);
      if (tierIdx >= 0 && tierIdx < TIERS.length - 1) {
        newTierId = TIERS[tierIdx + 1].id;
      }
    }
  }

  return {
    ...data,
    exercises: newExercises,
    currentTierId: newTierId,
  };
}

/**
 * Calculate proficiency score (0-1) with 7-day time decay.
 */
export function getExerciseProficiency(progress: ExerciseProgress): number {
  if (progress.history.length === 0) return 0;
  const now = Date.now();
  const DECAY_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

  let weightedSum = 0;
  let totalWeight = 0;
  for (const record of progress.history.slice(0, 10)) {
    const ageMs = now - record.timestamp;
    const weight = Math.pow(0.5, ageMs / DECAY_HALF_LIFE_MS);
    weightedSum += record.accuracy * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Get exercises that need review, tagged with the specific stage to serve
 * and the reason it was queued. Shaky entries point at the exact stage that
 * scored low; stale entries point at the stage the user would naturally
 * practice next (either the current stage or the last completed one as a
 * refresher).
 */
export function getReviewExercises(
  data: ScalesProgressData,
): ReviewEntry[] {
  const reviews: ReviewEntry[] = [];
  for (const [exerciseId, progress] of Object.entries(data.exercises)) {
    if (progress.needsReview && progress.reviewStageId) {
      reviews.push({
        exerciseId,
        stageId: progress.reviewStageId,
        reason: 'shaky',
      });
      continue;
    }
    if (progress.needsReview) {
      // Legacy records from before reviewStageId existed — fall back to the
      // stage the user was on so we still surface the flag.
      reviews.push({
        exerciseId,
        stageId: progress.currentStageId,
        reason: 'shaky',
      });
      continue;
    }
    if (isStale(progress)) {
      // Prefer the last-completed stage (a true refresher) over the
      // next-new stage — review should consolidate, not push into new
      // territory. Fall back to currentStageId if the user has never
      // completed anything (shouldn't happen because isStale requires a
      // completedStageId, but kept defensively).
      reviews.push({
        exerciseId,
        stageId: progress.completedStageId ?? progress.currentStageId,
        reason: 'stale',
      });
    }
  }
  return reviews;
}
