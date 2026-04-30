import { findExercise } from './curriculum/tiers';

/**
 * Per-exercise rollup of how a completed session went, surfaced on the
 * post-session Home screen. Built from `currentSessionRuns` at
 * COMPLETE_SESSION time so we can show "what you cleared / drilled / are
 * still working on" without consumers re-deriving it from history.
 */
export interface SessionExerciseSummary {
  exerciseId: string;
  /** "C Major Scale" — read off the exercise definition. */
  exerciseLabel: string;
  /**
   * - `cleared`: at least one normal-purpose run advanced the user to a new stage
   *   in this session.
   * - `drilled`: the user opted into Drill it for this exercise (the stage was
   *   already cleared coming into the session, or cleared during it).
   * - `shaky`: practiced but no advancement and no drilling — still working on
   *   the same stage.
   */
  status: 'cleared' | 'drilled' | 'shaky';
  /** Highest accuracy across all runs of this exercise in the session. */
  bestAccuracy: number;
  /** Total run count for this exercise within the session. */
  runs: number;
}

/** Internal accumulator entry for `currentSessionRuns`. Exported for tests. */
export interface SessionRunRecord {
  exerciseId: string;
  stageId: string;
  advanced: boolean;
  accuracy: number;
  purpose?: 'drill';
}

export function buildSessionSummary(runs: SessionRunRecord[]): SessionExerciseSummary[] {
  const order: string[] = [];
  const grouped = new Map<string, SessionRunRecord[]>();
  for (const run of runs) {
    if (!grouped.has(run.exerciseId)) {
      order.push(run.exerciseId);
      grouped.set(run.exerciseId, []);
    }
    grouped.get(run.exerciseId)!.push(run);
  }

  const out: SessionExerciseSummary[] = [];
  for (const exerciseId of order) {
    const exRuns = grouped.get(exerciseId)!;
    const drilled = exRuns.some(r => r.purpose === 'drill');
    const cleared = !drilled && exRuns.some(r => r.advanced);
    const status: SessionExerciseSummary['status'] = drilled
      ? 'drilled'
      : cleared
      ? 'cleared'
      : 'shaky';
    const bestAccuracy = exRuns.reduce((m, r) => Math.max(m, r.accuracy), 0);
    const found = findExercise(exerciseId);
    out.push({
      exerciseId,
      exerciseLabel: found?.exercise.label ?? exerciseId,
      status,
      bestAccuracy,
      runs: exRuns.length,
    });
  }
  return out;
}
