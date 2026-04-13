import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUrlState } from './useUrlState';
import type { ChordProgressionState } from '../types';
import { flushPendingHistoryUpdates, cancelPendingHistoryUpdates } from '../../shared/utils/urlHistory';

function makeState(overrides: Partial<ChordProgressionState> = {}): ChordProgressionState {
  return {
    progression: { name: 'I-V-vi-IV', progression: ['I', 'V', 'vi', 'IV'] },
    key: 'C',
    tempo: 120,
    timeSignature: { numerator: 4, denominator: 4 },
    stylingStrategy: 'simple',
    voicingOptions: { useInversions: false, useOpenVoicings: false, randomizeOctaves: false },
    soundType: 'sine',
    measuresPerChord: 1,
    ...overrides,
  };
}

describe('useUrlState (chords)', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/chords/');
  });

  afterEach(() => {
    cancelPendingHistoryUpdates();
  });

  describe('getInitialState', () => {
    it('should return null when no URL params', () => {
      const { result } = renderHook(() => useUrlState());
      const state = result.current.getInitialState();
      expect(state).toBeNull();
    });

    it('should parse key from URL', () => {
      window.history.replaceState({}, '', '/chords/?key=G');
      const { result } = renderHook(() => useUrlState());
      const state = result.current.getInitialState();
      expect(state?.key).toBe('G');
    });

    it('should parse tempo from URL', () => {
      window.history.replaceState({}, '', '/chords/?tempo=140');
      const { result } = renderHook(() => useUrlState());
      const state = result.current.getInitialState();
      expect(state?.tempo).toBe(140);
    });

    it('should parse time signature from URL', () => {
      window.history.replaceState({}, '', '/chords/?time=3%2F4');
      const { result } = renderHook(() => useUrlState());
      const state = result.current.getInitialState();
      expect(state?.timeSignature).toEqual({ numerator: 3, denominator: 4 });
    });

    it('should parse styling from URL', () => {
      window.history.replaceState({}, '', '/chords/?styling=waltz');
      const { result } = renderHook(() => useUrlState());
      const state = result.current.getInitialState();
      expect(state?.stylingStrategy).toBe('waltz');
    });

    it('should ignore invalid tempo values', () => {
      window.history.replaceState({}, '', '/chords/?tempo=999');
      const { result } = renderHook(() => useUrlState());
      const state = result.current.getInitialState();
      expect(state?.tempo).toBeUndefined();
    });
  });

  describe('browser history (back/forward navigation)', () => {
    it('should create history entries when URL changes via pushState', () => {
      const { result } = renderHook(() => useUrlState());
      const initialLength = window.history.length;

      act(() => {
        result.current.syncToUrl(makeState({ key: 'G', tempo: 140 }));
      });
      flushPendingHistoryUpdates();

      expect(window.history.length).toBe(initialLength + 1);
      expect(window.location.search).toContain('key=G');
      expect(window.location.search).toContain('tempo=140');
    });

    it('should not create duplicate history entries for the same URL', () => {
      const { result } = renderHook(() => useUrlState());

      act(() => {
        result.current.syncToUrl(makeState({ key: 'G', tempo: 140 }));
      });
      flushPendingHistoryUpdates();

      const afterFirst = window.history.length;

      act(() => {
        result.current.syncToUrl(makeState({ key: 'G', tempo: 140 }));
      });
      flushPendingHistoryUpdates();

      expect(window.history.length).toBe(afterFirst);
    });

    it('should use replaceState for rapid consecutive changes (debounce)', () => {
      const { result } = renderHook(() => useUrlState());
      const initialLength = window.history.length;

      act(() => {
        result.current.syncToUrl(makeState({ tempo: 1 }));
        flushPendingHistoryUpdates();
        result.current.syncToUrl(makeState({ tempo: 14 }));
        flushPendingHistoryUpdates();
        result.current.syncToUrl(makeState({ tempo: 140 }));
        flushPendingHistoryUpdates();
      });

      // Only one pushState, rest are replaceState
      expect(window.history.length).toBe(initialLength + 1);
      expect(window.location.search).toContain('tempo=140');
    });

    it('should push a new history entry for rapid non-tempo changes', () => {
      const { result } = renderHook(() => useUrlState());
      const initialLength = window.history.length;

      act(() => {
        result.current.syncToUrl(makeState({ tempo: 130 }));
        flushPendingHistoryUpdates();
        result.current.syncToUrl(makeState({ tempo: 130, key: 'G' }));
        flushPendingHistoryUpdates();
      });

      expect(window.history.length).toBe(initialLength + 2);
      expect(window.location.search).toContain('key=G');
      expect(window.location.search).toContain('tempo=130');
    });

    it('should support popstate listener for back/forward navigation', () => {
      const { result } = renderHook(() => useUrlState());
      const callback = vi.fn();

      act(() => {
        result.current.setupPopStateListener(callback);
      });

      // Simulate going back to a URL that has params (chords popstate only fires when params exist)
      window.history.replaceState({}, '', '/chords/?key=D&tempo=100');
      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        key: 'D',
        tempo: 100,
      }));
    });

    it('should cleanup popstate listener', () => {
      const { result } = renderHook(() => useUrlState());
      const callback = vi.fn();

      let cleanup: (() => void) | undefined;
      act(() => {
        cleanup = result.current.setupPopStateListener(callback);
      });

      cleanup?.();

      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(callback).not.toHaveBeenCalled();
    });

    it('should emit null state when URL has no params on popstate', () => {
      const { result } = renderHook(() => useUrlState());
      const callback = vi.fn();

      act(() => {
        result.current.setupPopStateListener(callback);
      });

      window.history.replaceState({}, '', '/chords/');
      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(callback).toHaveBeenCalledWith(null);
    });
  });
});
