import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useAutoLoopScheduler,
  DEFAULT_AUTO_LOOP_DWELL_MS,
} from './useAutoLoopScheduler';
import type { ExerciseResult } from '../store';

function makeResult(overrides: Partial<ExerciseResult> = {}): ExerciseResult {
  return {
    accuracy: 0.85,
    correct: 7,
    total: 8,
    advanced: false,
    breakdown: {
      perfect: 7,
      early: 0,
      late: 1,
      wrongPitch: 0,
      missed: 0,
    },
    ...overrides,
  };
}

describe('useAutoLoopScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not schedule a tick when there is no result yet', () => {
    const onTick = vi.fn();
    renderHook(() =>
      useAutoLoopScheduler({
        lastExerciseResult: null,
        isPlaying: false,
        paused: false,
        onTick,
      }),
    );
    act(() => {
      vi.advanceTimersByTime(DEFAULT_AUTO_LOOP_DWELL_MS + 100);
    });
    expect(onTick).not.toHaveBeenCalled();
  });

  it('fires onTick once after the dwell when the result was sub-threshold', () => {
    const onTick = vi.fn();
    const { result } = renderHook(
      ({ lastExerciseResult }) =>
        useAutoLoopScheduler({
          lastExerciseResult,
          isPlaying: false,
          paused: false,
          onTick,
        }),
      { initialProps: { lastExerciseResult: makeResult({ advanced: false }) } },
    );

    expect(result.current.countdown).toBe(
      Math.ceil(DEFAULT_AUTO_LOOP_DWELL_MS / 1000),
    );

    act(() => {
      vi.advanceTimersByTime(DEFAULT_AUTO_LOOP_DWELL_MS);
    });
    expect(onTick).toHaveBeenCalledTimes(1);
    expect(result.current.countdown).toBeNull();
  });

  it('does NOT fire onTick when the result advanced the stage (default stopOnAdvance)', () => {
    const onTick = vi.fn();
    renderHook(() =>
      useAutoLoopScheduler({
        lastExerciseResult: makeResult({ advanced: true }),
        isPlaying: false,
        paused: false,
        onTick,
      }),
    );
    act(() => {
      vi.advanceTimersByTime(DEFAULT_AUTO_LOOP_DWELL_MS + 100);
    });
    expect(onTick).not.toHaveBeenCalled();
  });

  it('DOES fire onTick on advanced results when stopOnAdvance is false (drill mode)', () => {
    // Drill mode runs entirely *after* the user has passed, so every drill
    // round comes back with `advanced: true`. The hook must keep looping
    // anyway — `paused` is the only stop signal in this mode.
    const onTick = vi.fn();
    renderHook(() =>
      useAutoLoopScheduler({
        lastExerciseResult: makeResult({ advanced: true }),
        isPlaying: false,
        paused: false,
        stopOnAdvance: false,
        onTick,
      }),
    );
    act(() => {
      vi.advanceTimersByTime(DEFAULT_AUTO_LOOP_DWELL_MS);
    });
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('still respects paused when stopOnAdvance is false', () => {
    const onTick = vi.fn();
    renderHook(() =>
      useAutoLoopScheduler({
        lastExerciseResult: makeResult({ advanced: true }),
        isPlaying: false,
        paused: true,
        stopOnAdvance: false,
        onTick,
      }),
    );
    act(() => {
      vi.advanceTimersByTime(DEFAULT_AUTO_LOOP_DWELL_MS + 100);
    });
    expect(onTick).not.toHaveBeenCalled();
  });

  it('does NOT fire onTick while playing', () => {
    const onTick = vi.fn();
    renderHook(() =>
      useAutoLoopScheduler({
        lastExerciseResult: makeResult(),
        isPlaying: true,
        paused: false,
        onTick,
      }),
    );
    act(() => {
      vi.advanceTimersByTime(DEFAULT_AUTO_LOOP_DWELL_MS + 100);
    });
    expect(onTick).not.toHaveBeenCalled();
  });

  it('does NOT fire onTick when paused', () => {
    const onTick = vi.fn();
    renderHook(() =>
      useAutoLoopScheduler({
        lastExerciseResult: makeResult(),
        isPlaying: false,
        paused: true,
        onTick,
      }),
    );
    act(() => {
      vi.advanceTimersByTime(DEFAULT_AUTO_LOOP_DWELL_MS + 100);
    });
    expect(onTick).not.toHaveBeenCalled();
  });

  it('cancels a pending tick when paused mid-dwell', () => {
    const onTick = vi.fn();
    const { rerender } = renderHook(
      ({ paused }: { paused: boolean }) =>
        useAutoLoopScheduler({
          lastExerciseResult: makeResult(),
          isPlaying: false,
          paused,
          onTick,
        }),
      { initialProps: { paused: false } },
    );

    act(() => {
      vi.advanceTimersByTime(DEFAULT_AUTO_LOOP_DWELL_MS / 2);
    });
    rerender({ paused: true });
    act(() => {
      vi.advanceTimersByTime(DEFAULT_AUTO_LOOP_DWELL_MS);
    });
    expect(onTick).not.toHaveBeenCalled();
  });

  it('uses the latest onTick closure (not the one captured when scheduling started)', () => {
    // Important because in SessionScreen `onTick` closes over `startPlayback`
    // which can re-create on every render. The hook must still call the
    // current implementation when the timer fires.
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ onTick }: { onTick: () => void }) =>
        useAutoLoopScheduler({
          lastExerciseResult: makeResult(),
          isPlaying: false,
          paused: false,
          onTick,
        }),
      { initialProps: { onTick: first } },
    );

    rerender({ onTick: second });
    act(() => {
      vi.advanceTimersByTime(DEFAULT_AUTO_LOOP_DWELL_MS);
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('reschedules when a new sub-threshold result arrives', () => {
    const onTick = vi.fn();
    const r1 = makeResult({ accuracy: 0.7 });
    const r2 = makeResult({ accuracy: 0.8 });
    const { rerender } = renderHook(
      ({ lastExerciseResult }) =>
        useAutoLoopScheduler({
          lastExerciseResult,
          isPlaying: false,
          paused: false,
          onTick,
        }),
      { initialProps: { lastExerciseResult: r1 } },
    );

    act(() => {
      vi.advanceTimersByTime(DEFAULT_AUTO_LOOP_DWELL_MS);
    });
    expect(onTick).toHaveBeenCalledTimes(1);

    // Simulate the next playback finishing with a new (still sub-threshold)
    // result. This is exactly the SessionScreen flow: onTick → startPlayback
    // → eventually FINISH_EXERCISE → new lastExerciseResult identity.
    rerender({ lastExerciseResult: r2 });
    act(() => {
      vi.advanceTimersByTime(DEFAULT_AUTO_LOOP_DWELL_MS);
    });
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it('respects a custom dwell duration', () => {
    const onTick = vi.fn();
    renderHook(() =>
      useAutoLoopScheduler({
        lastExerciseResult: makeResult(),
        isPlaying: false,
        paused: false,
        onTick,
        dwellMs: 1000,
      }),
    );
    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(onTick).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onTick).toHaveBeenCalledTimes(1);
  });
});
