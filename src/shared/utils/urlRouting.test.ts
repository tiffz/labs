import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { subscribeToPopState, syncUrlWithHistory } from './urlRouting';
import { flushPendingHistoryUpdates, cancelPendingHistoryUpdates } from './urlHistory';

describe('urlRouting', () => {
  const originalPathname = window.location.pathname;
  const originalSearch = window.location.search;

  beforeEach(() => {
    window.history.replaceState({}, '', '/words');
  });

  afterEach(() => {
    cancelPendingHistoryUpdates();
    window.history.replaceState({}, '', `${originalPathname}${originalSearch}`);
  });

  it('pushes for non-debounced URL changes', () => {
    const state = { lastPushTime: 0 };
    const strategy = syncUrlWithHistory('/words?song=abc', state, {
      debounceMs: 900,
      replaceDebounceParams: new Set(['bpm']),
    }, 1000);
    flushPendingHistoryUpdates();

    expect(strategy).toBe('push');
    expect(state.lastPushTime).toBe(1000);
    expect(window.location.search).toBe('?song=abc');
  });

  it('replaces for debounced URL changes inside debounce window', () => {
    window.history.replaceState({}, '', '/words?bpm=100');
    const state = { lastPushTime: 1000 };
    const strategy = syncUrlWithHistory('/words?bpm=110', state, {
      debounceMs: 900,
      replaceDebounceParams: new Set(['bpm']),
    }, 1300);
    flushPendingHistoryUpdates();

    expect(strategy).toBe('replace');
    expect(state.lastPushTime).toBe(1000);
    expect(window.location.search).toBe('?bpm=110');
  });

  it('subscribes to popstate events', () => {
    const onPop = vi.fn();
    const unsubscribe = subscribeToPopState(onPop);

    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(onPop).toHaveBeenCalledTimes(1);

    unsubscribe();
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(onPop).toHaveBeenCalledTimes(1);
  });
});
