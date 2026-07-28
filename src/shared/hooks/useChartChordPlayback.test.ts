import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useChartChordPlayback } from './useChartChordPlayback';
import type { ChartLayout } from '../music/chordPro/chordChartLayout';
import { chartPlaybackMeasureDurationMs } from '../music/chordPro/chartPlaybackSequence';

const scheduleStyledChordMeasure = vi.fn();
const scheduleDrumMeasure = vi.fn();
const ensureInstrument = vi.fn();
const stopAll = vi.fn();

// Capture the context handed to the drum-player factory so a test can assert the
// ADR 0025 "one AudioContext" wiring: the drum player must be built on the SAME
// ctx the chord session exposes, never a freshly minted second one.
const createChartDrumAudioPlayer = vi.fn(() => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  ensureResumed: vi.fn().mockResolvedValue(true),
  getAudioContext: () => ({ currentTime: 0, state: 'running' }),
  stopAll: vi.fn(),
  destroy: vi.fn(),
}));

// Stable reference for the chord session's AudioContext — identity is what the
// single-context invariant checks, so it must be the same object every resolve.
const chordSessionCtx = { currentTime: 0, state: 'running' as const };

vi.mock('../music/scheduleStyledChordMeasure', () => ({
  scheduleStyledChordMeasure: (...args: unknown[]) => scheduleStyledChordMeasure(...args),
}));

vi.mock('../music/scheduleDrumMeasure', () => ({
  createChartDrumAudioPlayer: (...args: unknown[]) => createChartDrumAudioPlayer(...args),
  scheduleDrumMeasure: (...args: unknown[]) => scheduleDrumMeasure(...args),
}));

vi.mock('../music/chordInstrumentSession', () => ({
  ChordInstrumentSession: vi.fn().mockImplementation(() => ({
    isDisposed: () => false,
    primeAudioContext: vi.fn(),
    setSampleLoadListener: vi.fn(),
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
  useSampledPianoPreload: () => ({
    current: {
      isDisposed: () => false,
      primeAudioContext: vi.fn(),
      setSampleLoadListener: vi.fn(),
      ensureInstrument: (...args: unknown[]) => ensureInstrument(...args),
      stopAll: (...args: unknown[]) => stopAll(...args),
      dispose: vi.fn(),
    },
  }),
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
    scheduleStyledChordMeasure.mockClear();
    scheduleDrumMeasure.mockClear();
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

  it('loops the whole song when loopWholeSong is on, and stops at the end when off', async () => {
    vi.useFakeTimers();
    // Two single-chord sections → four one-measure playback steps (the whole song).
    const multiSectionLayout: ChartLayout = {
      sections: [
        {
          sectionId: 'verse-1',
          type: 'Verse',
          header: 'Verse 1',
          lines: [
            { lineId: 'line-1', text: 'Hello', chords: [{ id: 'c1', charIndex: 0, chordName: 'C' }] },
          ],
        },
        {
          sectionId: 'chorus-0',
          type: 'Chorus',
          header: 'Chorus',
          lines: [
            { lineId: 'line-2', text: 'World', chords: [{ id: 'c2', charIndex: 0, chordName: 'G' }] },
          ],
        },
      ],
    };
    const measureMs = chartPlaybackMeasureDurationMs(120);
    const SONG_STEPS = 4;

    const { result } = renderHook(() =>
      useChartChordPlayback({
        layout: multiSectionLayout,
        tempo: 120,
        storageKey: 'test-chart-playback-loop-all',
      }),
    );

    // Off (default) → the main Play runs the whole song once (4 measures) then stops.
    await act(async () => {
      result.current.start();
      await vi.advanceTimersByTimeAsync(measureMs * 8);
    });
    expect(result.current.playingSectionId).toBeNull();
    expect(scheduleStyledChordMeasure).toHaveBeenCalledTimes(SONG_STEPS);
    expect(result.current.playing).toBe(false);

    // On → the same main Play loops the whole song: it plays past the end
    // (more measures than the song is long) and never stops on its own.
    scheduleStyledChordMeasure.mockClear();
    act(() => {
      result.current.updateSettings({ loopWholeSong: true });
    });
    await act(async () => {
      result.current.start();
      await vi.advanceTimersByTimeAsync(measureMs * 8);
    });
    expect(result.current.playing).toBe(true);
    expect(result.current.playingSectionId).toBeNull();
    expect(scheduleStyledChordMeasure.mock.calls.length).toBeGreaterThan(SONG_STEPS);

    act(() => {
      result.current.stop();
    });
    expect(result.current.playing).toBe(false);

    vi.useRealTimers();
  });

  it('persists loopWholeSong across hook instances via storageKey', async () => {
    const storageKey = 'test-chart-playback-loop-persist';
    localStorage.removeItem(storageKey);

    const first = renderHook(() =>
      useChartChordPlayback({ layout, tempo: 120, storageKey }),
    );
    expect(first.result.current.settings.loopWholeSong).toBe(false);
    act(() => {
      first.result.current.updateSettings({ loopWholeSong: true });
    });
    first.unmount();

    const second = renderHook(() =>
      useChartChordPlayback({ layout, tempo: 120, storageKey }),
    );
    expect(second.result.current.settings.loopWholeSong).toBe(true);
    localStorage.removeItem(storageKey);
  });

  it('flushes voices when the tab is hidden while playing', async () => {
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

    expect(stopAll).toHaveBeenCalled();
    expect(result.current.playing).toBe(true);

    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
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
});
