import { describe, expect, it } from 'vitest';
import { getChangedQueryParams, getHistoryUpdateStrategy } from './urlHistory';

describe('urlHistory utilities', () => {
  describe('getChangedQueryParams', () => {
    it('returns changed keys for added, changed, and removed params', () => {
      const changed = getChangedQueryParams(
        '/drums?bpm=120&rhythm=abc&time=4/4',
        '/drums?bpm=140&groups=3+3+2'
      );

      expect(changed).toEqual(new Set(['bpm', 'rhythm', 'time', 'groups']));
    });

    it('returns empty set when query params are identical', () => {
      const changed = getChangedQueryParams('/chords?key=C&tempo=120', '/chords?key=C&tempo=120');
      expect(changed.size).toBe(0);
    });
  });

  describe('getHistoryUpdateStrategy', () => {
    it('returns skip when URL does not change', () => {
      const strategy = getHistoryUpdateStrategy({
        currentUrl: '/chords?key=C',
        newUrl: '/chords?key=C',
        now: 1000,
        lastPushTime: 0,
        debounceMs: 800,
        replaceDebounceParams: new Set(['tempo']),
      });

      expect(strategy).toBe('skip');
    });

    it('returns replace for debounce-only params within debounce window', () => {
      const strategy = getHistoryUpdateStrategy({
        currentUrl: '/chords?tempo=120',
        newUrl: '/chords?tempo=140',
        now: 500,
        lastPushTime: 0,
        debounceMs: 800,
        replaceDebounceParams: new Set(['tempo']),
      });

      expect(strategy).toBe('replace');
    });

    it('returns push when a non-debounced param changes', () => {
      const strategy = getHistoryUpdateStrategy({
        currentUrl: '/chords?tempo=120&key=C',
        newUrl: '/chords?tempo=140&key=G',
        now: 500,
        lastPushTime: 0,
        debounceMs: 800,
        replaceDebounceParams: new Set(['tempo']),
      });

      expect(strategy).toBe('push');
    });

    it('returns push when debounce window has elapsed', () => {
      const strategy = getHistoryUpdateStrategy({
        currentUrl: '/drums?bpm=120',
        newUrl: '/drums?bpm=140',
        now: 1000,
        lastPushTime: 0,
        debounceMs: 800,
        replaceDebounceParams: new Set(['bpm', 'rhythm']),
      });

      expect(strategy).toBe('push');
    });
  });
});
