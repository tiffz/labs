import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useChartChordPlayback } from './useChartChordPlayback';
import type { ChartLayout } from '../music/chordPro/chordChartLayout';
import { chartPlaybackMeasureDurationMs } from '../music/chordPro/chartPlaybackSequence';

const scheduleStyledChordMeasure = vi.fn();
const scheduleDrumMeasure = vi.fn();
const ensureInstrument = vi.fn();
const stopAll = vi.fn();

vi.mock('../music/scheduleStyledChordMeasure', () => ({
  scheduleStyledChordMeasure: (...args: unknown[]) => scheduleStyledChordMeasure(...args),
}));

vi.mock('../music/scheduleDrumMeasure', () => ({
  createChartDrumAudioPlayer: vi.fn(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    ensureResumed: vi.fn().mockResolvedValue(true),
    getAudioContext: () => ({ currentTime: 0, state: 'running' }),
    stopAll: vi.fn(),
    destroy: vi.fn(),
  })),
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
    ensureInstrument.mockResolvedValue({
      ctx: { currentTime: 0, state: 'running' },
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
});
