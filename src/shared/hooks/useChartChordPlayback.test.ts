import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useChartChordPlayback } from './useChartChordPlayback';
import type { ChartLayout } from '../music/chordPro/chordChartLayout';

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
    stopAll: vi.fn(),
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
      ctx: { currentTime: 0 },
      instrument: { stopAll: vi.fn() },
    });
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
        ctx: { currentTime: 0 },
        instrument: { stopAll: vi.fn() },
      });
      await Promise.resolve();
    });

    expect(scheduleStyledChordMeasure).not.toHaveBeenCalled();
    expect(scheduleDrumMeasure).not.toHaveBeenCalled();
    expect(stopAll).toHaveBeenCalled();
    expect(result.current.playing).toBe(false);
  });
});
