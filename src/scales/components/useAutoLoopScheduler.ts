import { useEffect, useRef, useState } from 'react';
import type { ExerciseResult } from '../store';

/**
 * Single source of truth for the post-attempt auto-loop. Whenever a
 * non-advancing, non-paused result is present and we're not currently
 * playing, schedule a short dwell + countdown and then fire `onTick` to
 * restart the exercise. Hooks out a small piece of `SessionScreen` that's
 * worth unit-testing in isolation: the rest of the session screen is
 * heavily intertwined with playback / grading / MIDI.
 *
 * `lastExerciseResult.advanced === true` is the natural exit for regular
 * practice — when the user has finally cleared the streak, the boundary
 * UI takes over and waits for an explicit Continue click. Drill mode
 * sets `stopOnAdvance: false` because the user has *already* advanced
 * (drilling is voluntary post-pass polish) and they explicitly want the
 * loop to keep going until they hit the perfect-runs target.
 */
export interface UseAutoLoopSchedulerArgs {
  lastExerciseResult: ExerciseResult | null;
  isPlaying: boolean;
  paused: boolean;
  /** Fired when the dwell elapses; should restart the current exercise. */
  onTick: () => void;
  /** Total dwell duration in milliseconds. */
  dwellMs?: number;
  /**
   * When `true` (default) the scheduler treats `lastExerciseResult.advanced`
   * as a hard exit. When `false` (drill mode), the loop keeps firing even
   * on already-advanced results — `paused` is then the only stop signal.
   */
  stopOnAdvance?: boolean;
}

export interface UseAutoLoopSchedulerResult {
  /** Live countdown (seconds remaining) or `null` when not dwelling. */
  countdown: number | null;
}

export const DEFAULT_AUTO_LOOP_DWELL_MS = 1000;

export function useAutoLoopScheduler(
  args: UseAutoLoopSchedulerArgs,
): UseAutoLoopSchedulerResult {
  const { lastExerciseResult, isPlaying, paused, onTick } = args;
  const dwellMs = args.dwellMs ?? DEFAULT_AUTO_LOOP_DWELL_MS;
  const stopOnAdvance = args.stopOnAdvance ?? true;
  const [countdown, setCountdown] = useState<number | null>(null);
  // onTick can change identity on every render (closures over startPlayback,
  // dispatch). Stash it in a ref so the schedule effect doesn't reset on
  // every parent render and double-fire the timer.
  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!lastExerciseResult || isPlaying) return;
    if (stopOnAdvance && lastExerciseResult.advanced) return;
    if (paused) return;

    const steps = Math.ceil(dwellMs / 1000);
    setCountdown(steps);
    const interval = setInterval(() => {
      setCountdown(prev => (prev !== null && prev > 1 ? prev - 1 : prev));
    }, 1000);

    const timeout = setTimeout(() => {
      setCountdown(null);
      onTickRef.current();
    }, dwellMs);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      setCountdown(null);
    };
  }, [lastExerciseResult, isPlaying, paused, dwellMs, stopOnAdvance]);

  return { countdown };
}
