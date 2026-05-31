import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  deriveActiveChordMeasure,
  useWordsPlaybackActions,
  useWordsPlaybackRangeState,
} from './useWordsPlaybackSelection';
import type { Instrument } from '../../shared/playback/instruments';
import type { SoundType } from '../../shared/music/soundOptions';

describe('deriveActiveChordMeasure', () => {
  it('returns measure index while playing with chord labels', () => {
    expect(
      deriveActiveChordMeasure({
        isPlaying: true,
        chordLabelsByMeasure: new Map([[0, 'C']]),
        currentNote: { measureIndex: 2 },
      })
    ).toBe(2);
  });

  it('returns null when stopped or no chord labels', () => {
    expect(
      deriveActiveChordMeasure({
        isPlaying: false,
        chordLabelsByMeasure: new Map([[0, 'C']]),
        currentNote: { measureIndex: 2 },
      })
    ).toBeNull();
    expect(
      deriveActiveChordMeasure({
        isPlaying: true,
        chordLabelsByMeasure: new Map(),
        currentNote: { measureIndex: 2 },
      })
    ).toBeNull();
  });
});

describe('useWordsPlaybackRangeState', () => {
  it('tracks section loop selection state', () => {
    const { result } = renderHook(() => useWordsPlaybackRangeState());

    act(() => {
      result.current.setActiveSectionLoopId('chorus-1');
      result.current.setPlaybackSelectionRange({ startTick: 16, endTick: 32 });
      result.current.setPendingPlaybackStartMode('section');
    });

    expect(result.current.activeSectionLoopId).toBe('chorus-1');
    expect(result.current.playbackSelectionRange).toEqual({ startTick: 16, endTick: 32 });
    expect(result.current.pendingPlaybackStartMode).toBe('section');
  });
});

describe('useWordsPlaybackActions', () => {
  it('stopPlaybackImmediately clears chord instrument refs', () => {
    const handleStop = vi.fn();
    const handleStopRef = { current: handleStop };
    const stopAll = vi.fn();
    const disconnect = vi.fn();
    const instrument = { stopAll, disconnect } as unknown as Instrument;
    const chordInstrumentRef = { current: instrument };
    const chordInstrumentTypeRef = { current: 'piano' as SoundType };

    const setters = {
      setActiveSectionLoopId: vi.fn(),
      setPlaybackSelectionRange: vi.fn(),
      setPendingPlaybackStartMode: vi.fn(),
    };

    const { result } = renderHook(() =>
      useWordsPlaybackActions({
        handleStopRef,
        chordInstrumentRef,
        chordInstrumentTypeRef,
        sectionTickRanges: [{ startTick: 0, endTick: 16 }],
        ...setters,
      })
    );

    act(() => {
      result.current.stopPlaybackImmediately();
    });

    expect(handleStop).toHaveBeenCalledOnce();
    expect(stopAll).toHaveBeenCalledWith(0);
    expect(disconnect).toHaveBeenCalledOnce();
    expect(chordInstrumentRef.current).toBeNull();
    expect(chordInstrumentTypeRef.current).toBeNull();
  });

  it('playSectionLoop sets range and pending start mode', () => {
    const setters = {
      setActiveSectionLoopId: vi.fn(),
      setPlaybackSelectionRange: vi.fn(),
      setPendingPlaybackStartMode: vi.fn(),
    };

    const { result } = renderHook(() =>
      useWordsPlaybackActions({
        handleStopRef: { current: null },
        chordInstrumentRef: { current: null },
        chordInstrumentTypeRef: { current: null },
        sectionTickRanges: [undefined, { startTick: 16, endTick: 32 }],
        ...setters,
      })
    );

    act(() => {
      result.current.playSectionLoop('section-2', 1);
    });

    expect(setters.setActiveSectionLoopId).toHaveBeenCalledWith('section-2');
    expect(setters.setPlaybackSelectionRange).toHaveBeenCalledWith({
      startTick: 16,
      endTick: 32,
    });
    expect(setters.setPendingPlaybackStartMode).toHaveBeenCalledWith('section');
  });

  it('playSectionLoop ignores invalid ranges', () => {
    const setters = {
      setActiveSectionLoopId: vi.fn(),
      setPlaybackSelectionRange: vi.fn(),
      setPendingPlaybackStartMode: vi.fn(),
    };

    const { result } = renderHook(() =>
      useWordsPlaybackActions({
        handleStopRef: { current: null },
        chordInstrumentRef: { current: null },
        chordInstrumentTypeRef: { current: null },
        sectionTickRanges: [{ startTick: 10, endTick: 10 }],
        ...setters,
      })
    );

    act(() => {
      result.current.playSectionLoop('section-1', 0);
    });

    expect(setters.setActiveSectionLoopId).not.toHaveBeenCalled();
  });
});
