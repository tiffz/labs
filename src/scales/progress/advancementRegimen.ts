import type { ExerciseKind, Stage } from '../curriculum/types';
import { isGuidedSubdivisionStage } from '../curriculum/guidedStages';
import type { PracticeRecord } from './types';

/**
 * How a metronome stage decides whether a run counts toward advancement.
 *
 * - **guided-threshold** — subdivision scaffold: N consecutive runs at ≥
 *   {@link AdvancementRegimen.threshold} accuracy (typically 85%).
 * - **perfect-streak** — all other timed stages: literal pitch + timing
 *   perfection ({@link runMeetsPerfectBar}), then an overlearning streak
 *   sized from attempts-to-first-perfect.
 */
export type AdvancementRegimenKind = 'guided-threshold' | 'perfect-streak';

export interface AdvancementRegimen {
  kind: AdvancementRegimenKind;
  /** Min accuracy (0–1) for guided-threshold runs. */
  threshold?: number;
  /** Consecutive qualifying runs for guided-threshold advancement. */
  runs?: number;
}

/** Threshold + run count for guided subdivision stages only. */
export interface GuidedThresholdCriteria {
  threshold: number;
  runs: number;
}

/**
 * Accuracy bar for guided subdivision stages. Not used for perfect-streak
 * advancement (those require {@link runMeetsPerfectBar}).
 */
export function getGuidedThresholdCriteria(
  stage: Stage,
  isFinalStage: boolean = false,
  exerciseKind?: ExerciseKind,
): GuidedThresholdCriteria {
  if (!stage.useTempo) return { threshold: 1.0, runs: 2 };
  if (
    exerciseKind != null
    && (exerciseKind === 'pentascale-major' || exerciseKind === 'pentascale-minor')
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

export function resolveAdvancementRegimen(
  stage: Stage,
  isFinalStage: boolean = false,
  exerciseKind?: ExerciseKind,
): AdvancementRegimen {
  if (isGuidedSubdivisionStage(stage)) {
    const { threshold, runs } = getGuidedThresholdCriteria(stage, isFinalStage, exerciseKind);
    return { kind: 'guided-threshold', threshold, runs };
  }
  return { kind: 'perfect-streak' };
}

/** Whether a run is pitch- and timing-perfect (same bar as drill mode). */
export function runMeetsPerfectBar(record: PracticeRecord): boolean {
  if (record.breakdown) {
    const { early, late, wrongPitch, missed } = record.breakdown;
    return early + late + wrongPitch + missed === 0;
  }
  return record.accuracy >= 1;
}

/**
 * Whether a run meets the guided-threshold accuracy bar (and pentascale
 * single-hand timing nuance when breakdown is present).
 */
export function runMeetsGuidedThresholdBar(
  record: PracticeRecord,
  regimen: AdvancementRegimen,
  exerciseKind: ExerciseKind,
  stage: Stage,
  isFinalStage: boolean,
): boolean {
  if (regimen.kind !== 'guided-threshold' || regimen.threshold == null) return false;
  if (record.breakdown) {
    const { wrongPitch, missed } = record.breakdown;
    if (wrongPitch + missed > 0) return false;
  }
  if (
    (exerciseKind === 'pentascale-major' || exerciseKind === 'pentascale-minor')
    && record.breakdown
    && stage.useTempo
    && stage.hand === 'both'
  ) {
    return record.accuracy + 1e-9 >= regimen.threshold;
  }
  if (
    (exerciseKind === 'pentascale-major' || exerciseKind === 'pentascale-minor')
    && record.breakdown
    && stage.useTempo
  ) {
    const { wrongPitch, missed, early, late } = record.breakdown;
    if (wrongPitch + missed > 0) return false;
    return early + late <= 1;
  }
  const threshold = regimen.threshold
    ?? getGuidedThresholdCriteria(stage, isFinalStage, exerciseKind).threshold;
  return record.accuracy + 1e-9 >= threshold;
}

export type RunAdvancementOutcome = 'qualifying' | 'near' | 'below';

/** UI / streak tier aligned with the stage's advancement regimen. */
export function runAdvancementOutcome(
  record: PracticeRecord,
  regimen: AdvancementRegimen,
  exerciseKind: ExerciseKind,
  stage: Stage,
  isFinalStage: boolean,
): RunAdvancementOutcome {
  if (regimen.kind === 'perfect-streak') {
    if (runMeetsPerfectBar(record)) return 'qualifying';
    if (record.breakdown) {
      const { wrongPitch, missed, early, late } = record.breakdown;
      if (wrongPitch + missed === 0 && early + late > 0) return 'near';
    } else if (record.accuracy + 1e-9 >= 0.8) {
      return 'near';
    }
    return 'below';
  }

  if (runMeetsGuidedThresholdBar(record, regimen, exerciseKind, stage, isFinalStage)) {
    return 'qualifying';
  }

  const threshold = regimen.threshold
    ?? getGuidedThresholdCriteria(stage, isFinalStage, exerciseKind).threshold;
  if (
    (exerciseKind === 'pentascale-major' || exerciseKind === 'pentascale-minor')
    && record.breakdown
    && stage.useTempo
    && stage.hand !== 'both'
  ) {
    const { wrongPitch, missed, early, late } = record.breakdown;
    if (wrongPitch + missed === 0 && early + late === 2) return 'near';
  }
  if (record.accuracy + 1e-9 >= Math.max(0.8, threshold - 0.05)) return 'near';
  return 'below';
}

/** @deprecated Prefer {@link runAdvancementOutcome} — maps qualifying → clean. */
export type RunOutcomeTier = 'clean' | 'near' | 'rough';

export function runOutcomeTier(
  record: PracticeRecord,
  exerciseKind: ExerciseKind,
  stage: Stage,
  isFinalStage: boolean,
): RunOutcomeTier {
  const regimen = resolveAdvancementRegimen(stage, isFinalStage, exerciseKind);
  const outcome = runAdvancementOutcome(record, regimen, exerciseKind, stage, isFinalStage);
  if (outcome === 'qualifying') return 'clean';
  if (outcome === 'near') return 'near';
  return 'rough';
}

export function runQualifiesForAdvancement(
  record: PracticeRecord,
  regimen: AdvancementRegimen,
  exerciseKind: ExerciseKind,
  stage: Stage,
  isFinalStage: boolean,
): boolean {
  if (regimen.kind === 'perfect-streak') return runMeetsPerfectBar(record);
  return runMeetsGuidedThresholdBar(record, regimen, exerciseKind, stage, isFinalStage);
}
