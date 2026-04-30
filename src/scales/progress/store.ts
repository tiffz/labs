import type {
  ScalesProgressData,
  ExerciseProgress,
  PracticeRecord,
  IntroducedConcepts,
  IntroducedHands,
} from './types';
import { TIERS, findExercise, isPentascaleKind } from '../curriculum/tiers';
import type { ExerciseDefinition, ExerciseKind, Stage } from '../curriculum/types';
import { triggerConcepts } from '../curriculum/concepts';

const STORAGE_KEY = 'scales-progress';
const MAX_HISTORY_PER_EXERCISE = 20;
const REVIEW_ACCURACY_THRESHOLD = 0.7;
const STALE_DAYS = 5;

/**
 * Per-stage advancement criteria. Replaces a single global "3 runs at 90%"
 * rule with thresholds tuned to the pedagogical demands of each stage type:
 *
 *   - Free-tempo stages have no timing grading, so we require pitch-perfect
 *     runs but only 2 in a row to keep onboarding from dragging.
 *   - Standard tempo stages (hands-separate / hands-together intro through
 *     the Fluent checkpoint) hold the RCM/ABRSM-style "3 clean runs in a
 *     row at ≥90%" gate.
 *   - Subdivisions and most 2-octave stages loosen the threshold to 85%.
 *     These are meaningfully harder than 1-octave straight notes, and
 *     holding 90% on full-speed sixteenths is unrealistic for most
 *     learners; 85% still demands a real streak.
 *   - The very last stage of every exercise is the mastery gate and snaps
 *     back to the strict 90% bar — reaching "Mastered" should mean
 *     something.
 */
export interface AdvancementCriteria {
  threshold: number;
  runs: number;
}

/**
 * Practice rows that count toward "N clean runs in a row" for stage
 * advancement and {@link getCleanRunStreak}. Warmup and drill rows stay
 * in history for proficiency / migrations but must not satisfy the gate.
 */
function recordCountsTowardAdvancementStreak(record: PracticeRecord): boolean {
  return record.purpose !== 'drill' && record.purpose !== 'warmup';
}

export function getAdvancementCriteria(
  stage: Stage,
  isFinalStage: boolean = false,
  exerciseKind?: ExerciseKind,
): AdvancementCriteria {
  if (!stage.useTempo) return { threshold: 1.0, runs: 2 };
  if (
    exerciseKind != null
    && isPentascaleKind(exerciseKind)
    && stage.hand === 'both'
    && stage.useTempo
  ) {
    return { threshold: 0.85, runs: 3 };
  }
  if (isFinalStage) return { threshold: 0.90, runs: 3 };
  if (stage.subdivision !== 'none') return { threshold: 0.85, runs: 3 };
  if (stage.octaves === 2) return { threshold: 0.85, runs: 3 };
  return { threshold: 0.90, runs: 3 };
}

/**
 * Whether a finished run counts toward the stage clean streak and
 * advancement window. **Both-hand** pentascale metronome stages use the
 * same {@link PracticeRecord.accuracy} as the results UI (≥85%).
 * **Single-hand** pentascale metronome stages use pitch vs timing nuance
 * when {@link PracticeRecord.breakdown} is present (`early+late<=1`
 * with no wrong pitch / misses). Otherwise this is `accuracy >= threshold`.
 */
export function runMeetsCleanBar(
  record: PracticeRecord,
  exerciseKind: ExerciseKind,
  stage: Stage,
  isFinalStage: boolean,
): boolean {
  if (
    isPentascaleKind(exerciseKind)
    && record.breakdown
    && stage.useTempo
    && stage.hand === 'both'
  ) {
    return record.accuracy + 1e-9 >= 0.85;
  }
  if (
    isPentascaleKind(exerciseKind)
    && record.breakdown
    && stage.useTempo
  ) {
    const { wrongPitch, missed, early, late } = record.breakdown;
    if (wrongPitch + missed > 0) return false;
    return early + late <= 1;
  }
  const { threshold } = getAdvancementCriteria(stage, isFinalStage, exerciseKind);
  return record.accuracy + 1e-9 >= threshold;
}

export type RunOutcomeTier = 'clean' | 'near' | 'rough';

/**
 * UI tier for a non-drill run: {@link runMeetsCleanBar}, else "near miss"
 * heuristics (pentascale: two timing slips with clean pitch; general:
 * accuracy within 5pp of threshold and at least 80%).
 */
export function runOutcomeTier(
  record: PracticeRecord,
  exerciseKind: ExerciseKind,
  stage: Stage,
  isFinalStage: boolean,
): RunOutcomeTier {
  if (runMeetsCleanBar(record, exerciseKind, stage, isFinalStage)) return 'clean';
  const { threshold } = getAdvancementCriteria(stage, isFinalStage, exerciseKind);
  if (
    isPentascaleKind(exerciseKind)
    && record.breakdown
    && stage.useTempo
    && stage.hand !== 'both'
  ) {
    const { wrongPitch, missed, early, late } = record.breakdown;
    if (wrongPitch + missed === 0 && early + late === 2) return 'near';
  }
  if (record.accuracy + 1e-9 >= Math.max(0.8, threshold - 0.05)) return 'near';
  return 'rough';
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
  for (const record of consecutiveStageRecords(progress.history, stageId)) {
    if (!recordCountsTowardAdvancementStreak(record)) continue;
    if (runMeetsCleanBar(record, found.exercise.kind, stage, isFinalStage)) {
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
    version: 3,
    exercises: {},
    currentTierId: TIERS[0].id,
    seenOnboarding: false,
    introducedConcepts: {},
    introducedExerciseHands: {},
  };
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
    return { ...v2, introducedConcepts, introducedExerciseHands };
  }
  if (data.version === 2) {
    const { introducedConcepts, introducedExerciseHands } = backfillIntroductions(exercises);
    return {
      version: 3,
      exercises,
      currentTierId,
      seenOnboarding: data.seenOnboarding === true,
      introducedConcepts,
      introducedExerciseHands,
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
    return {
      version: 3,
      exercises,
      currentTierId,
      seenOnboarding: data.seenOnboarding === true,
      introducedConcepts,
      introducedExerciseHands,
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

  if (found && record.stageId === progress.currentStageId) {
    const stages = found.exercise.stages;
    const currentIdx = stages.findIndex(s => s.id === record.stageId);
    const stage = currentIdx >= 0 ? stages[currentIdx] : null;

    if (stage) {
      const isFinalStage = currentIdx === stages.length - 1;
      const { runs } = getAdvancementCriteria(stage, isFinalStage, found.exercise.kind);

      const meaningfulOnStage = consecutiveStageRecords(updatedHistory, record.stageId)
        .filter(recordCountsTowardAdvancementStreak);
      const recentForStage = meaningfulOnStage.slice(0, runs);

      const shouldAdvance =
        recentForStage.length >= runs &&
        recentForStage.every(r =>
          runMeetsCleanBar(r, found.exercise.kind, stage, isFinalStage),
        );

      if (shouldAdvance) {
        newCompletedStageId = record.stageId;
        if (currentIdx >= 0 && currentIdx < stages.length - 1) {
          newCurrentStageId = stages[currentIdx + 1].id;
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
