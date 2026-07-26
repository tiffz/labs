import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useChartChordPlayback } from './useChartChordPlayback';
import type { ChartLayout } from '../music/chordPro/chordChartLayout';
import { chartPlaybackMeasureDurationMs } from '../music/chordPro/chartPlaybackSequence';

const scheduleStyledChordMeasure = vi.fn();
const scheduleDrumMeasure = vi.fn();
const scheduleMetronomeMeasure = vi.fn();
const ensureInstrument = vi.fn();
const stopAll = vi.fn();

// Capture the context handed to the drum-player factory so a test can assert the
// ADR 0025 "one AudioContext" wiring: the drum player must be built on the SAME
// ctx the chord session exposes, never a freshly minted second one.
const createChartDrumAudioPlayer = vi.fn<(...args: unknown[]) => unknown>(() => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  ensureResumed: vi.fn().mockResolvedValue(true),
  getAudioContext: () => ({ currentTime: 0, state: 'running' }),
  stopAll: vi.fn(),
  destroy: vi.fn(),
}));

// Stable reference for the chord session's AudioContext — identity is what the
// single-context invariant checks, so it must be the same object every resolve.
const chordSessionCtx = { currentTime: 0, state: 'running' as const };

// Shared, resettable preload ref (production returns a per-mount `useRef`). The hook's
// unmount cleanup nulls `.current`, so re-seat it before each test for isolation.
const preloadState = vi.hoisted(() => ({ ref: { current: null as unknown } }));
function seatPreloadRef(): void {
  preloadState.ref.current = {
    isDisposed: () => false,
    primeAudioContext: vi.fn(),
    setSampleLoadListener: vi.fn(),
    getAudioContext: () => ({ currentTime: 0, state: 'running' }),
    ensureInstrument: (...args: unknown[]) => ensureInstrument(...args),
    stopAll: (...args: unknown[]) => stopAll(...args),
    dispose: vi.fn(),
  };
}

vi.mock('../music/scheduleStyledChordMeasure', () => ({
  scheduleStyledChordMeasure: (...args: unknown[]) => scheduleStyledChordMeasure(...args),
}));

vi.mock('../music/scheduleDrumMeasure', () => ({
  createChartDrumAudioPlayer: (...args: unknown[]) => createChartDrumAudioPlayer(...args),
  scheduleDrumMeasure: (...args: unknown[]) => scheduleDrumMeasure(...args),
}));

vi.mock('../music/scheduleMetronomeMeasure', () => ({
  scheduleMetronomeMeasure: (...args: unknown[]) => scheduleMetronomeMeasure(...args),
}));

vi.mock('../music/chordInstrumentSession', () => ({
  ChordInstrumentSession: vi.fn().mockImplementation(() => ({
    isDisposed: () => false,
    primeAudioContext: vi.fn(),
    setSampleLoadListener: vi.fn(),
    getAudioContext: () => ({ currentTime: 0, state: 'running' }),
    ensureInstrument: (...args: unknown[]) => ensureInstrument(...args),
    stopAll: (...args: unknown[]) => stopAll(...args),
    dispose: vi.fn(),
  })),
}));

vi.mock('../playback/audioContextLifecycle', () => ({
  ensureAudioContextRunning: vi.fn().mockResolvedValue(true),
}));

vi.mock('../audio/usePlaybackWakeLock', () => ({
  usePlaybackWakeLock: vi.fn(),
}));

vi.mock('./useSampledPianoPreload', () => ({
  // Stable ref across renders (production returns a `useRef`). A fresh object each
  // render would churn the [instrumentSessionRef] cleanup effect (it calls stopAll on
  // teardown) on any background re-render.
  useSampledPianoPreload: () => preloadState.ref,
}));

const layout: ChartLayout = {
  sections: [
    {
      sectionId: 'verse-1',
      type: 'Verse',
      header: 'Verse 1',
      lines: [
        {
          lineId: 'line-1',
          text: 'Hello',
          chords: [{ id: 'c1', charIndex: 0, chordName: 'C' }],
        },
      ],
    },
  ],
};

describe('useChartChordPlayback stop', () => {
  beforeEach(() => {
    seatPreloadRef();
    scheduleStyledChordMeasure.mockClear();
    scheduleDrumMeasure.mockClear();
    scheduleMetronomeMeasure.mockClear();
    stopAll.mockClear();
    createChartDrumAudioPlayer.mockClear();
    ensureInstrument.mockResolvedValue({
      ctx: chordSessionCtx,
      instrument: { stopAll: vi.fn() },
    });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  it('does not schedule audio after stop invalidates an in-flight measure', async () => {
    let resolveInstrument: ((value: unknown) => void) | null = null;
    ensureInstrument.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInstrument = resolve;
        }),
    );

    const { result } = renderHook(() =>
      useChartChordPlayback({
        layout,
        tempo: 120,
        storageKey: 'test-chart-playback-stop',
      }),
    );

    act(() => {
      result.current.start();
    });

    await act(async () => {
      result.current.stop();
      resolveInstrument?.({
        ctx: { currentTime: 0, state: 'running' },
        instrument: { stopAll: vi.fn() },
      });
      await Promise.resolve();
    });

    expect(scheduleStyledChordMeasure).not.toHaveBeenCalled();
    expect(scheduleDrumMeasure).not.toHaveBeenCalled();
    expect(stopAll).toHaveBeenCalled();
    expect(result.current.playing).toBe(false);
  });

  it('loops a single section until stop', async () => {
    vi.useFakeTimers();
    const multiSectionLayout: ChartLayout = {
      sections: [
        {
          sectionId: 'verse-1',
          type: 'Verse',
          header: 'Verse 1',
          lines: [
            {
              lineId: 'line-1',
              text: 'Hello',
              chords: [{ id: 'c1', charIndex: 0, chordName: 'C' }],
            },
          ],
        },
        {
          sectionId: 'chorus-0',
          type: 'Chorus',
          header: 'Chorus',
          lines: [
            {
              lineId: 'line-2',
              text: 'World',
              chords: [{ id: 'c2', charIndex: 0, chordName: 'G' }],
            },
          ],
        },
      ],
    };

    const { result } = renderHook(() =>
      useChartChordPlayback({
        layout: multiSectionLayout,
        tempo: 120,
        storageKey: 'test-chart-playback-section-loop',
      }),
    );

    await act(async () => {
      result.current.startSectionLoop('verse-1');
      await Promise.resolve();
    });

    expect(result.current.playing).toBe(true);
    expect(result.current.playingSectionId).toBe('verse-1');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(chartPlaybackMeasureDurationMs(120) * 2);
    });

    expect(result.current.playing).toBe(true);
    expect(result.current.playingSectionId).toBe('verse-1');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(chartPlaybackMeasureDurationMs(120) * 2);
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.playing).toBe(false);
    expect(result.current.playingSectionId).toBeNull();
    vi.useRealTimers();
  });

  it('keeps playing when the tab is hidden — no flush blast (ADR 0025 background playback)', async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    const { result } = renderHook(() =>
      useChartChordPlayback({
        layout,
        tempo: 120,
        storageKey: 'test-chart-playback-visibility',
      }),
    );

    await act(async () => {
      result.current.startSectionLoop('verse-1');
      await Promise.resolve();
    });
    expect(result.current.playing).toBe(true);
    stopAll.mockClear();

    await act(async () => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    // Hidden no longer stops or flushes — playback continues in the background.
    expect(stopAll).not.toHaveBeenCalled();
    expect(result.current.playing).toBe(true);

    // Returning to visible keeps playing (re-anchors only if the clock actually froze).
    await act(async () => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    expect(result.current.playing).toBe(true);
  });

  it('builds the drum player on the chord session context — one AudioContext (ADR 0025 step 1)', async () => {
    const { result } = renderHook(() =>
      useChartChordPlayback({
        layout,
        tempo: 120,
        storageKey: 'test-chart-playback-single-context',
      }),
    );

    // Drums off by default — enable so the drum player is actually built.
    act(() => {
      result.current.updateSettings({ drumsEnabled: true });
    });

    await act(async () => {
      result.current.start();
      // Drain ensureInstrument -> ensureAudioContextRunning -> ensureDrumPlayerReady.
      for (let i = 0; i < 8; i += 1) await Promise.resolve();
    });

    // The invariant: the drum-player factory received the EXACT ctx object the chord
    // session exposed — not a second minted context (the dual-clock regression).
    // Assert object IDENTITY (`toBe`), not `toHaveBeenCalledWith` — the latter deep-
    // equals, so a freshly minted `{currentTime,state}` would slip past.
    expect(createChartDrumAudioPlayer).toHaveBeenCalledTimes(1);
    expect(createChartDrumAudioPlayer.mock.calls[0]?.[0]).toBe(chordSessionCtx);

    act(() => {
      result.current.stop();
    });
  });

  it('schedules metronome clicks each measure when metronomeEnabled — same clock as chords', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useChartChordPlayback({
        layout,
        tempo: 120,
        storageKey: 'test-chart-playback-metronome-on',
      }),
    );

    act(() => {
      result.current.updateSettings({ metronomeEnabled: true });
    });

    await act(async () => {
      result.current.startSectionLoop('verse-1');
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(chartPlaybackMeasureDurationMs(120) * 2);
    });

    // A measure was scheduled (ticks fired) AND the metronome rode the same call.
    expect(scheduleStyledChordMeasure).toHaveBeenCalled();
    expect(scheduleMetronomeMeasure).toHaveBeenCalled();

    act(() => {
      result.current.stop();
    });
    vi.useRealTimers();
  });

  it('schedules no metronome clicks when metronomeEnabled is off', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useChartChordPlayback({
        layout,
        tempo: 120,
        storageKey: 'test-chart-playback-metronome-off',
      }),
    );

    await act(async () => {
      result.current.startSectionLoop('verse-1');
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(chartPlaybackMeasureDurationMs(120) * 2);
    });

    // Chords scheduled (ticks fired), but the metronome stayed silent while off.
    expect(scheduleStyledChordMeasure).toHaveBeenCalled();
    expect(scheduleMetronomeMeasure).not.toHaveBeenCalled();

    act(() => {
      result.current.stop();
    });
    vi.useRealTimers();
  });
});
