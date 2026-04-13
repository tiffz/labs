import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUrlState } from './useUrlState';
import { flushPendingHistoryUpdates } from '../../shared/utils/urlHistory';

describe('useUrlState', () => {
  beforeEach(() => {
    // Reset URL before each test
    window.history.replaceState({}, '', '/drums');
  });

  describe('getInitialState', () => {
    it('should return default state when no URL params', () => {
      const { result } = renderHook(() => useUrlState());
      const state = result.current.getInitialState();
      
      expect(state).toEqual({
        notation: 'D-T-__T-D---T---',
        timeSignature: { numerator: 4, denominator: 4 },
        bpm: 120,
        beatGrouping: undefined,
        metronomeEnabled: false,
      });
    });

    it('should parse rhythm from URL', () => {
      window.history.replaceState({}, '', '/drums?rhythm=D-T-K-');
      
      const { result } = renderHook(() => useUrlState());
      const state = result.current.getInitialState();
      
      expect(state.notation).toBe('D-T-K-');
    });

    it('should parse bpm from URL', () => {
      window.history.replaceState({}, '', '/drums?bpm=140');
      
      const { result } = renderHook(() => useUrlState());
      const state = result.current.getInitialState();
      
      expect(state.bpm).toBe(140);
    });

    it('should parse time signature from URL', () => {
      window.history.replaceState({}, '', '/drums?time=3/4');
      
      const { result } = renderHook(() => useUrlState());
      const state = result.current.getInitialState();
      
      expect(state.timeSignature).toEqual({ numerator: 3, denominator: 4 });
    });

    it('should parse all params from URL', () => {
      window.history.replaceState({}, '', '/drums?rhythm=D-D-K-T-&time=2/4&bpm=160');
      
      const { result } = renderHook(() => useUrlState());
      const state = result.current.getInitialState();
      
      expect(state).toEqual({
        notation: 'D-D-K-T-',
        timeSignature: { numerator: 2, denominator: 4 },
        bpm: 160,
        beatGrouping: undefined,
        metronomeEnabled: false,
      });
    });

    it('should handle invalid bpm gracefully', () => {
      window.history.replaceState({}, '', '/drums?bpm=invalid');
      
      const { result } = renderHook(() => useUrlState());
      const state = result.current.getInitialState();
      
      expect(state.bpm).toBe(120); // Falls back to default
    });

    it('should handle invalid time signature gracefully', () => {
      window.history.replaceState({}, '', '/drums?time=invalid');
      
      const { result } = renderHook(() => useUrlState());
      const state = result.current.getInitialState();
      
      expect(state.timeSignature).toEqual({ numerator: 4, denominator: 4 }); // Falls back to default
    });

    it('should parse beat grouping from URL', () => {
      window.history.replaceState({}, '', '/drums?groups=' + encodeURIComponent('3+3+2'));
      
      const { result } = renderHook(() => useUrlState());
      const state = result.current.getInitialState();
      
      expect(state.beatGrouping).toEqual([3, 3, 2]);
    });

    it('should parse metronome enabled from URL', () => {
      window.history.replaceState({}, '', '/drums?metronome=true');
      
      const { result } = renderHook(() => useUrlState());
      const state = result.current.getInitialState();
      
      expect(state.metronomeEnabled).toBe(true);
    });

    it('should parse all params including new ones from URL', () => {
      window.history.replaceState({}, '', '/drums?rhythm=D-T-K-&time=11%2F8&bpm=140&groups=' + encodeURIComponent('3+3+3+2') + '&metronome=true');
      
      const { result } = renderHook(() => useUrlState());
      const state = result.current.getInitialState();
      
      expect(state).toEqual({
        notation: 'D-T-K-',
        timeSignature: { numerator: 11, denominator: 8 },
        bpm: 140,
        beatGrouping: [3, 3, 3, 2],
        metronomeEnabled: true,
      });
    });
  });

  describe('syncToUrl', () => {
    it('should update URL with non-default values', () => {
      const { result } = renderHook(() => useUrlState());
      
      act(() => {
        result.current.syncToUrl({
          notation: 'D-T-K-',
          timeSignature: { numerator: 3, denominator: 4 },
          bpm: 140,
        });
      });
      flushPendingHistoryUpdates();
      
      const params = new URLSearchParams(window.location.search);
      expect(params.get('rhythm')).toBe('D-T-K-');
      expect(params.get('time')).toBe('3/4');
      expect(params.get('bpm')).toBe('140');
    });

    it('should omit default values from URL', () => {
      const { result } = renderHook(() => useUrlState());
      
      act(() => {
        result.current.syncToUrl({
          notation: 'D-T-__T-D---T---', // default
          timeSignature: { numerator: 4, denominator: 4 }, // default
          bpm: 120, // default
        });
      });
      flushPendingHistoryUpdates();
      
      expect(window.location.search).toBe('');
    });

    it('should only include changed params', () => {
      const { result } = renderHook(() => useUrlState());
      
      act(() => {
        result.current.syncToUrl({
          notation: 'D-T-K-', // changed
          timeSignature: { numerator: 4, denominator: 4 }, // default
          bpm: 120, // default
        });
      });
      flushPendingHistoryUpdates();
      
      const params = new URLSearchParams(window.location.search);
      expect(params.get('rhythm')).toBe('D-T-K-');
      expect(params.has('time')).toBe(false);
      expect(params.has('bpm')).toBe(false);
    });
  });

  describe('setupPopStateListener', () => {
    it('should call callback when popstate event fires', () => {
      const { result } = renderHook(() => useUrlState());
      const callback = vi.fn();
      
      act(() => {
        result.current.setupPopStateListener(callback);
      });
      
      // Simulate browser back/forward
      window.history.replaceState({}, '', '/drums?rhythm=D-K-T-&bpm=150');
      window.dispatchEvent(new PopStateEvent('popstate'));
      
      expect(callback).toHaveBeenCalledWith({
        notation: 'D-K-T-',
        timeSignature: { numerator: 4, denominator: 4 },
        bpm: 150,
        beatGrouping: undefined,
        metronomeEnabled: false,
      });
    });

    it('should cleanup listener on unmount', () => {
      const { result } = renderHook(() => useUrlState());
      const callback = vi.fn();
      
      let cleanup: (() => void) | undefined;
      act(() => {
        cleanup = result.current.setupPopStateListener(callback);
      });
      
      // Call cleanup
      if (cleanup) {
        cleanup();
      }
      
      // Simulate popstate - should not call callback
      window.dispatchEvent(new PopStateEvent('popstate'));
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('browser history (back/forward navigation)', () => {
    it('should create history entries when URL changes via pushState', () => {
      const { result } = renderHook(() => useUrlState());
      const initialLength = window.history.length;

      act(() => {
        result.current.syncToUrl({
          notation: 'D-T-K-',
          timeSignature: { numerator: 4, denominator: 4 },
          bpm: 120,
        });
      });
      flushPendingHistoryUpdates();

      expect(window.history.length).toBe(initialLength + 1);
      expect(new URLSearchParams(window.location.search).get('rhythm')).toBe(
        'D-T-K-'
      );
    });

    it('should not create duplicate history entries for the same URL', () => {
      const { result } = renderHook(() => useUrlState());

      act(() => {
        result.current.syncToUrl({
          notation: 'D-T-K-',
          timeSignature: { numerator: 4, denominator: 4 },
          bpm: 120,
        });
      });
      flushPendingHistoryUpdates();

      const lengthAfterFirst = window.history.length;

      act(() => {
        result.current.syncToUrl({
          notation: 'D-T-K-',
          timeSignature: { numerator: 4, denominator: 4 },
          bpm: 120,
        });
      });
      flushPendingHistoryUpdates();

      expect(window.history.length).toBe(lengthAfterFirst);
    });

    it('should use replaceState for rapid consecutive changes (debounce)', () => {
      const { result } = renderHook(() => useUrlState());
      const initialLength = window.history.length;

      act(() => {
        result.current.syncToUrl({
          notation: 'D-T-__T-D---T---',
          timeSignature: { numerator: 4, denominator: 4 },
          bpm: 1,
        });
        flushPendingHistoryUpdates();
        result.current.syncToUrl({
          notation: 'D-T-__T-D---T---',
          timeSignature: { numerator: 4, denominator: 4 },
          bpm: 14,
        });
        flushPendingHistoryUpdates();
        result.current.syncToUrl({
          notation: 'D-T-__T-D---T---',
          timeSignature: { numerator: 4, denominator: 4 },
          bpm: 140,
        });
        flushPendingHistoryUpdates();
      });

      // Only the first call should pushState; the rapid follow-ups should replaceState
      expect(window.history.length).toBe(initialLength + 1);
      // Final value should be in the URL
      expect(window.location.search).toContain('bpm=140');
    });

    it('should push a new history entry for rapid non-bpm/rhythm changes', () => {
      const { result } = renderHook(() => useUrlState());
      const initialLength = window.history.length;

      act(() => {
        result.current.syncToUrl({
          notation: 'D-T-__T-D---T---',
          timeSignature: { numerator: 4, denominator: 4 },
          bpm: 130,
        });
        flushPendingHistoryUpdates();
        result.current.syncToUrl({
          notation: 'D-T-__T-D---T---',
          timeSignature: { numerator: 7, denominator: 8 },
          bpm: 130,
        });
        flushPendingHistoryUpdates();
      });

      expect(window.history.length).toBe(initialLength + 2);
      expect(window.location.search).toContain('time=7%2F8');
    });

    it('should support full back/forward cycle with popstate', () => {
      const { result } = renderHook(() => useUrlState());
      const callback = vi.fn();

      act(() => {
        result.current.setupPopStateListener(callback);
      });

      act(() => {
        result.current.syncToUrl({
          notation: 'D--KD-T-',
          timeSignature: { numerator: 2, denominator: 4 },
          bpm: 160,
        });
      });
      flushPendingHistoryUpdates();

      expect(new URLSearchParams(window.location.search).get('rhythm')).toBe(
        'D--KD-T-'
      );

      // Simulate back button (browser fires popstate with the previous URL state)
      window.history.replaceState({}, '', '/drums');
      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        notation: 'D-T-__T-D---T---',
        bpm: 120,
      }));
    });
  });
});

