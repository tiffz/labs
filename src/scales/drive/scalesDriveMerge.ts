import { TIERS, findExercise } from '../curriculum/tiers';
import type {
  ExerciseProgress,
  IntroducedConcepts,
  IntroducedHands,
  PracticeRecord,
  ScalesProgressData,
} from '../progress/types';
import { normalizeScalesProgressPayload } from '../progress/store';

const MAX_HISTORY_PER_EXERCISE = 20;

export type ScalesDriveMergeReport = {
  exercisesMerged: number;
  exercisesFromLocalOnly: number;
  exercisesFromRemoteOnly: number;
  historyRowsMerged: number;
};

function stageIndex(exerciseId: string, stageId: string | null): number {
  if (!stageId) return -1;
  const found = findExercise(exerciseId);
  if (!found) return -1;
  return found.exercise.stages.findIndex((s) => s.id === stageId);
}

function furtherStageId(exerciseId: string, a: string | null, b: string | null): string | null {
  const ia = stageIndex(exerciseId, a);
  const ib = stageIndex(exerciseId, b);
  if (ia < 0) return b;
  if (ib < 0) return a;
  return ia >= ib ? a : b;
}

function tierIndex(tierId: string): number {
  const i = TIERS.findIndex((t) => t.id === tierId);
  return i < 0 ? 0 : i;
}

function mergeHistory(local: PracticeRecord[], remote: PracticeRecord[]): PracticeRecord[] {
  const byTs = new Map<number, PracticeRecord>();
  for (const r of [...local, ...remote]) {
    const existing = byTs.get(r.timestamp);
    if (!existing || r.accuracy >= existing.accuracy) {
      byTs.set(r.timestamp, r);
    }
  }
  return [...byTs.values()].sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_HISTORY_PER_EXERCISE);
}

function mergeIntroducedConcepts(a: IntroducedConcepts, b: IntroducedConcepts): IntroducedConcepts {
  const out: IntroducedConcepts = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v === true) {
      out[k as keyof IntroducedConcepts] = true;
    }
  }
  return out;
}

function mergeIntroducedHands(
  a: Record<string, IntroducedHands>,
  b: Record<string, IntroducedHands>,
): Record<string, IntroducedHands> {
  const out: Record<string, IntroducedHands> = { ...a };
  for (const [exerciseId, hands] of Object.entries(b)) {
    const prev = out[exerciseId] ?? {};
    out[exerciseId] = {
      right: prev.right || hands.right,
      left: prev.left || hands.left,
      both: prev.both || hands.both,
    };
  }
  return out;
}

function mergeExerciseProgress(local: ExerciseProgress, remote: ExerciseProgress): ExerciseProgress {
  const exerciseId = local.exerciseId || remote.exerciseId;
  const history = mergeHistory(local.history ?? [], remote.history ?? []);
  const completedStageId = furtherStageId(
    exerciseId,
    local.completedStageId,
    remote.completedStageId,
  );
  const currentStageId =
    furtherStageId(exerciseId, local.currentStageId, remote.currentStageId) ??
    local.currentStageId ??
    remote.currentStageId;
  const needsReview = local.needsReview || remote.needsReview;
  let reviewStageId: string | null = null;
  if (needsReview) {
    if (local.needsReview && remote.needsReview) {
      reviewStageId = furtherStageId(exerciseId, local.reviewStageId, remote.reviewStageId);
    } else if (local.needsReview) {
      reviewStageId = local.reviewStageId;
    } else {
      reviewStageId = remote.reviewStageId;
    }
  }
  const lastLocal = local.lastPracticedAt ?? '';
  const lastRemote = remote.lastPracticedAt ?? '';
  const lastPracticedAt = lastLocal >= lastRemote ? local.lastPracticedAt : remote.lastPracticedAt;
  return {
    exerciseId,
    completedStageId,
    currentStageId,
    history,
    needsReview,
    reviewStageId,
    lastPracticedAt,
  };
}

function maxIso(a: string | undefined, b: string | undefined): string | undefined {
  const ta = (a ?? '').trim();
  const tb = (b ?? '').trim();
  if (!ta) return tb || undefined;
  if (!tb) return ta;
  return ta >= tb ? ta : tb;
}

/**
 * Non-destructive merge of local and remote progress. Output is normalized
 * (migrate + reconcile) before return.
 */
export function mergeScalesProgress(
  localRaw: ScalesProgressData,
  remoteRaw: unknown,
): { progress: ScalesProgressData; report: ScalesDriveMergeReport } {
  const local = normalizeScalesProgressPayload(localRaw);
  const remote = normalizeScalesProgressPayload(remoteRaw);
  if (!remote) {
    return {
      progress: local,
      report: {
        exercisesMerged: 0,
        exercisesFromLocalOnly: Object.keys(local.exercises).length,
        exercisesFromRemoteOnly: 0,
        historyRowsMerged: 0,
      },
    };
  }

  const ids = new Set([...Object.keys(local.exercises), ...Object.keys(remote.exercises)]);
  const exercises: Record<string, ExerciseProgress> = {};
  let exercisesMerged = 0;
  let exercisesFromLocalOnly = 0;
  let exercisesFromRemoteOnly = 0;
  let historyRowsMerged = 0;

  for (const id of ids) {
    const l = local.exercises[id];
    const r = remote.exercises[id];
    if (l && r) {
      const merged = mergeExerciseProgress(l, r);
      exercises[id] = merged;
      exercisesMerged += 1;
      historyRowsMerged += merged.history.length;
    } else if (l) {
      exercises[id] = l;
      exercisesFromLocalOnly += 1;
    } else if (r) {
      exercises[id] = r;
      exercisesFromRemoteOnly += 1;
    }
  }

  const localTierIdx = tierIndex(local.currentTierId);
  const remoteTierIdx = tierIndex(remote.currentTierId);
  const currentTierId = remoteTierIdx > localTierIdx ? remote.currentTierId : local.currentTierId;

  const progress = normalizeScalesProgressPayload({
    version: 3,
    exercises,
    currentTierId,
    seenOnboarding: local.seenOnboarding || remote.seenOnboarding,
    introducedConcepts: mergeIntroducedConcepts(local.introducedConcepts, remote.introducedConcepts),
    introducedExerciseHands: mergeIntroducedHands(
      local.introducedExerciseHands,
      remote.introducedExerciseHands,
    ),
    progressUpdatedAt: maxIso(local.progressUpdatedAt, remote.progressUpdatedAt),
  })!;

  return {
    progress,
    report: {
      exercisesMerged,
      exercisesFromLocalOnly,
      exercisesFromRemoteOnly,
      historyRowsMerged,
    },
  };
}

export function formatScalesDriveMergeReport(report: ScalesDriveMergeReport): string {
  const parts: string[] = [];
  if (report.exercisesMerged > 0) parts.push(`merged ${report.exercisesMerged} exercise${report.exercisesMerged === 1 ? '' : 's'}`);
  if (report.exercisesFromRemoteOnly > 0) {
    parts.push(`added ${report.exercisesFromRemoteOnly} from Drive`);
  }
  if (report.exercisesFromLocalOnly > 0) {
    parts.push(`kept ${report.exercisesFromLocalOnly} local-only`);
  }
  return parts.length > 0 ? parts.join(', ') : 'already in sync';
}
