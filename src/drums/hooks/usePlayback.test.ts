import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlayback } from './usePlayback';
import { rhythmPlayer } from '../utils/rhythmPlayer';
import type { ParsedRhythm } from '../utils/rhythmParser';
import type { PlaybackSettings } from '../types/settings';

// Mock rhythmPlayer
vi.mock('../utils/rhythmPlayer', () => ({
  rhythmPlayer: {
    play: vi.fn(),
    stop: vi.fn(),
    setMetronomeEnabled: vi.fn(),
    setSettings: vi.fn(),
    setBpmAtMeasureBoundary: vi.fn(),
  },
}));

describe('usePlayback', () => {
  const mockParsedRhythm: ParsedRhythm = {
    isValid: true,
    measures: [
      {
        notes: [
          { sound: 'dum', duration: 1, durationInSixteenths: 1, isDotted: false },
        ],
        totalDuration: 1,
      },
    ],
    error: undefined,
  };

  const defaultSettings: PlaybackSettings = {
    measureAccentVolume: 90,
    beatGroupAccentVolume: 70,
    nonAccentVolume: 40,
    metronomeVolume: 50,
    reverbStrength: 20,
    emphasizeSimpleRhythms: false,
    autoScrollDuringPlayback: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should initialize with not playing', () => {
    const { result } = renderHook(() =>
      usePlayback({
        parsedRhythm: mockParsedRhythm,
        bpm: 120,
        debouncedBpm: 120,
        metronomeEnabled: false,
        playbackSettings: defaultSettings,
      })
    );

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentNote).toBeNull();
    expect(result.current.currentMetronomeBeat).toBeNull();
  });

  it('should call rhythmPlayer.play when handlePlay is called', () => {
    const { result } = renderHook(() =>
      usePlayback({
        parsedRhythm: mockParsedRhythm,
        bpm: 120,
        debouncedBpm: 120,
        metronomeEnabled: false,
        playbackSettings: defaultSettings,
      })
    );

    act(() => {
      result.current.handlePlay();
    });

    expect(rhythmPlayer.play).toHaveBeenCalledTimes(1);
    expect(rhythmPlayer.play).toHaveBeenCalledWith(
      mockParsedRhythm,
      120,
      expect.any(Function), // noteCallback
      expect.any(Function), // onComplete
      false, // metronomeEnabled
      expect.any(Function), // metronomeCallback
      defaultSettings,
      undefined // tickRange (no selection)
    );
    expect(result.current.isPlaying).toBe(true);
  });

  it('should not play if rhythm is invalid', () => {
    const invalidRhythm: ParsedRhythm = {
      isValid: false,
      measures: [],
      error: 'Invalid rhythm',
    };

    const { result } = renderHook(() =>
      usePlayback({
        parsedRhythm: invalidRhythm,
        bpm: 120,
        debouncedBpm: 120,
        metronomeEnabled: false,
        playbackSettings: defaultSettings,
      })
    );

    act(() => {
      result.current.handlePlay();
    });

    expect(rhythmPlayer.play).not.toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(false);
  });

  it('should not play if measures are empty', () => {
    const emptyRhythm: ParsedRhythm = {
      isValid: true,
      measures: [],
      error: undefined,
    };

    const { result } = renderHook(() =>
      usePlayback({
        parsedRhythm: emptyRhythm,
        bpm: 120,
        debouncedBpm: 120,
        metronomeEnabled: false,
        playbackSettings: defaultSettings,
      })
    );

    act(() => {
      result.current.handlePlay();
    });

    expect(rhythmPlayer.play).not.toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(false);
  });

  it('should call rhythmPlayer.stop when handleStop is called', () => {
    const { result } = renderHook(() =>
      usePlayback({
        parsedRhythm: mockParsedRhythm,
        bpm: 120,
        debouncedBpm: 120,
        metronomeEnabled: false,
        playbackSettings: defaultSettings,
      })
    );

    act(() => {
      result.current.handlePlay();
    });

    act(() => {
      result.current.handleStop();
    });

    expect(rhythmPlayer.stop).toHaveBeenCalledTimes(1);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentNote).toBeNull();
    expect(result.current.currentMetronomeBeat).toBeNull();
  });

  it('should update currentNote when note callback is called', () => {
    const { result } = renderHook(() =>
      usePlayback({
        parsedRhythm: mockParsedRhythm,
        bpm: 120,
        debouncedBpm: 120,
        metronomeEnabled: false,
        playbackSettings: defaultSettings,
      })
    );

    act(() => {
      result.current.handlePlay();
    });

    // Get the note callback from the play call
    const playCall = vi.mocked(rhythmPlayer.play).mock.calls[0];
    const noteCallback = playCall[2] as (measureIndex: number, noteIndex: number) => void;

    act(() => {
      noteCallback(0, 0);
    });

    expect(result.current.currentNote).toEqual({ measureIndex: 0, noteIndex: 0 });
  });

  it('should update currentMetronomeBeat when metronome callback is called', () => {
    const { result } = renderHook(() =>
      usePlayback({
        parsedRhythm: mockParsedRhythm,
        bpm: 120,
        debouncedBpm: 120,
        metronomeEnabled: true,
        playbackSettings: defaultSettings,
      })
    );

    act(() => {
      result.current.handlePlay();
    });

    // Get the metronome callback from the play call
    const playCall = vi.mocked(rhythmPlayer.play).mock.calls[0];
    const metronomeCallback = playCall[5] as (
      measureIndex: number,
      positionInSixteenths: number,
      isDownbeat: boolean
    ) => void;

    act(() => {
      metronomeCallback(0, 4, true);
    });

    expect(result.current.currentMetronomeBeat).toEqual({
      measureIndex: 0,
      positionInSixteenths: 4,
      isDownbeat: true,
    });
  });

  it('should reset state when onComplete callback is called', () => {
    const { result } = renderHook(() =>
      usePlayback({
        parsedRhythm: mockParsedRhythm,
        bpm: 120,
        debouncedBpm: 120,
        metronomeEnabled: false,
        playbackSettings: defaultSettings,
      })
    );

    act(() => {
      result.current.handlePlay();
    });

    // Get the onComplete callback from the play call
    const playCall = vi.mocked(rhythmPlayer.play).mock.calls[0];
    const onComplete = playCall[3] as () => void;

    act(() => {
      onComplete();
    });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentNote).toBeNull();
    expect(result.current.currentMetronomeBeat).toBeNull();
  });

  it('should call setMetronomeEnabled when handleMetronomeToggle is called', () => {
    const { result } = renderHook(() =>
      usePlayback({
        parsedRhythm: mockParsedRhythm,
        bpm: 120,
        debouncedBpm: 120,
        metronomeEnabled: false,
        playbackSettings: defaultSettings,
      })
    );

    act(() => {
      result.current.handleMetronomeToggle(true);
    });

    expect(rhythmPlayer.setMetronomeEnabled).toHaveBeenCalledWith(true);
  });

  it('should update settings when playbackSettings change during playback', async () => {
    const { result, rerender } = renderHook(
      (props) =>
        usePlayback({
          parsedRhythm: mockParsedRhythm,
          bpm: 120,
          debouncedBpm: 120,
          metronomeEnabled: false,
          playbackSettings: props.settings,
        }),
      {
        initialProps: { settings: defaultSettings },
      }
    );

    act(() => {
      result.current.handlePlay();
    });

    const newSettings: PlaybackSettings = {
      ...defaultSettings,
      measureAccentVolume: 80,
    };

    rerender({ settings: newSettings });

    await waitFor(() => {
      expect(rhythmPlayer.setSettings).toHaveBeenCalledWith(newSettings);
    });
  });

  it('should update BPM when debouncedBpm changes during playback', async () => {
    const { result, rerender } = renderHook(
      (props) =>
        usePlayback({
          parsedRhythm: mockParsedRhythm,
          bpm: 120,
          debouncedBpm: props.debouncedBpm,
          metronomeEnabled: false,
          playbackSettings: defaultSettings,
        }),
      {
        initialProps: { debouncedBpm: 120 },
      }
    );

    act(() => {
      result.current.handlePlay();
    });

    rerender({ debouncedBpm: 140 });

    await waitFor(() => {
      expect(rhythmPlayer.setBpmAtMeasureBoundary).toHaveBeenCalledWith(140);
    });
  });

  it('should pass metronomeEnabled state to rhythmPlayer.play', () => {
    const { result } = renderHook(() =>
      usePlayback({
        parsedRhythm: mockParsedRhythm,
        bpm: 120,
        debouncedBpm: 120,
        metronomeEnabled: true,
        playbackSettings: defaultSettings,
      })
    );

    act(() => {
      result.current.handlePlay();
    });

    const playCall = vi.mocked(rhythmPlayer.play).mock.calls[0];
    expect(playCall[4]).toBe(true); // metronomeEnabled parameter
  });

  it('should pass tickRange when selectionRange is provided', () => {
    const selectionRange = { startTick: 16, endTick: 32 };

    const { result } = renderHook(() =>
      usePlayback({
        parsedRhythm: mockParsedRhythm,
        bpm: 120,
        debouncedBpm: 120,
        metronomeEnabled: false,
        playbackSettings: defaultSettings,
        selectionRange,
      })
    );

    act(() => {
      result.current.handlePlay();
    });

    expect(rhythmPlayer.play).toHaveBeenCalledWith(
      mockParsedRhythm,
      120,
      expect.any(Function),
      expect.any(Function),
      false,
      expect.any(Function),
      defaultSettings,
      { startTick: 16, endTick: 32 }
    );
  });

  it('should pass undefined tickRange when selectionRange is null', () => {
    const { result } = renderHook(() =>
      usePlayback({
        parsedRhythm: mockParsedRhythm,
        bpm: 120,
        debouncedBpm: 120,
        metronomeEnabled: false,
        playbackSettings: defaultSettings,
        selectionRange: null,
      })
    );

    act(() => {
      result.current.handlePlay();
    });

    expect(rhythmPlayer.play).toHaveBeenCalledWith(
      mockParsedRhythm,
      120,
      expect.any(Function),
      expect.any(Function),
      false,
      expect.any(Function),
      defaultSettings,
      undefined
    );
  });
});

