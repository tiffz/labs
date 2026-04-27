/**
 * Pure helper functions for the SessionScreen drill mode + stuck-detection
 * state machines. Extracted so they can be unit tested in isolation — the
 * SessionScreen itself is heavily intertwined with playback / grading /
 * MIDI and is not worth a component-level harness for these branches.
 */

export type DrillState = 'inactive' | 'active' | 'completed';

/**
 * Updated drill streak after a single drill attempt. Strict 100% accuracy
 * is required to keep the streak alive — anything below resets to 0. The
 * 100% rule comes from the canonical scoring: `accuracy >= 1` means every
 * note was pitch-correct AND timing-perfect, which is what the user
 * implicitly asks for when they choose to "drill" the exercise.
 *
 * Floating-point `accuracy` values can land just shy of 1 due to division
 * (e.g. 7/8 + 1/8 sometimes serializes as 0.9999999); we treat anything at
 * or above 1 as perfect after rounding-friendly tolerance, but the
 * pipeline already produces an exact `correct/total` ratio so a strict
 * `>= 1` works in practice and stays explicit.
 */
export function nextDrillStreak(prev: number, accuracy: number): number {
  return accuracy >= 1 ? prev + 1 : 0;
}

/**
 * Whether the drill mode should surface the "Take a breather?" prompt.
 * Fires when the user has invested several drill attempts without making
 * any progress on the streak, which is the empirical pattern for
 * "fatigue-grooved errors" — pushing harder past this point usually
 * reinforces the mistake instead of fixing it.
 */
export function isDrillStuck(args: {
  drillState: DrillState;
  drillAttempts: number;
  drillStreak: number;
  snoozedUntil: number;
}): boolean {
  return args.drillState === 'active'
    && args.drillStreak === 0
    && args.drillAttempts >= args.snoozedUntil;
}

/**
 * Whether the regular auto-loop should surface the "Try going back?"
 * prompt — i.e., the user has been grinding the same stage for several
 * attempts without advancing, *and* there's an earlier stage they could
 * drop to as a refresher. The fallback gate prevents the prompt from ever
 * showing on the very first stage of an exercise.
 */
export type RegularStuckArgs = {
  drillState: DrillState;
  passedThisExercise: boolean;
  /** Total finished attempts on this stage (UI / copy); not used for the nag gate. */
  attemptsThisStage: number;
  /**
   * Consecutive rough (red-tier) runs on this stage, newest first, drill
   * rows skipped (`consecutiveRoughRunsOnStage` in progress/store). The
   * "Try going back?" prompt only fires after this reaches `snoozedUntil`
   * so near-miss runs do not count.
   */
  consecutiveRoughOnStage: number;
  cleanStreak: number;
  requiredRuns: number;
  hasFallbackStage: boolean;
  snoozedUntil: number;
};

export function isRegularStuck(args: RegularStuckArgs): boolean {
  return args.drillState === 'inactive'
    && !args.passedThisExercise
    && args.consecutiveRoughOnStage >= args.snoozedUntil
    && args.cleanStreak < args.requiredRuns
    && args.hasFallbackStage;
}

/**
 * When the raw "Try going back?" gate is true, still suppress the prompt (and
 * the auto-loop pause tied to it) if recent history shows the learner is
 * repeatedly hitting the advancement bar or literal 100% — they are
 * polishing, not stuck, even when the streak is not consecutive.
 */
export function shouldSuppressRegularStuckPrompt(
  history: readonly { stageId: string; accuracy: number }[],
  stageId: string,
  threshold: number,
  lookback: number,
  requiredRuns: number,
): boolean {
  const slice = history.filter(r => r.stageId === stageId).slice(0, lookback);
  if (slice.length === 0) return false;
  const atThreshold = slice.filter(r => r.accuracy + 1e-9 >= threshold).length;
  const literalPerfect = slice.filter(r => r.accuracy >= 1).length;
  return atThreshold >= requiredRuns || literalPerfect >= 3;
}

/** Same as {@link isRegularStuck} plus history-aware suppression. */
export function isRegularStuckGated(
  args: RegularStuckArgs & {
    history: readonly { stageId: string; accuracy: number }[];
    stageId: string;
    threshold: number;
  },
): boolean {
  if (!isRegularStuck(args)) return false;
  const lookback = Math.min(Math.max(args.attemptsThisStage, 1), 15);
  return !shouldSuppressRegularStuckPrompt(
    args.history,
    args.stageId,
    args.threshold,
    lookback,
    args.requiredRuns,
  );
}
