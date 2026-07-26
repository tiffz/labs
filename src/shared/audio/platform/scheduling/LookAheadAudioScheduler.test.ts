import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOOK_AHEAD_SEC, LookAheadAudioScheduler } from './LookAheadAudioScheduler';

describe('LookAheadAudioScheduler', () => {
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    vi.useFakeTimers();
    rafCallbacks = [];
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function pumpFrame() {
    const pending = rafCallbacks;
    rafCallbacks = [];
    for (const cb of pending) cb(performance.now());
  }

  it('ticks with the default look-ahead horizon', () => {
    const scheduler = new LookAheadAudioScheduler();
    const ticks: Array<{ horizonSec: number; nowSec: number }> = [];
    scheduler.start((horizonSec, nowSec) => ticks.push({ horizonSec, nowSec }));

    pumpFrame();
    expect(ticks).toHaveLength(1);
    expect(ticks[0].horizonSec - ticks[0].nowSec).toBeCloseTo(DEFAULT_LOOK_AHEAD_SEC, 5);
    scheduler.stop();
  });

  it('accepts a custom look-ahead horizon for chart transports', () => {
    const scheduler = new LookAheadAudioScheduler();
    const ticks: Array<{ horizonSec: number; nowSec: number }> = [];
    scheduler.start((horizonSec, nowSec) => ticks.push({ horizonSec, nowSec }), {
      lookAheadSec: 1,
    });

    pumpFrame();
    expect(ticks).toHaveLength(1);
    expect(ticks[0].horizonSec - ticks[0].nowSec).toBeCloseTo(1, 5);
    scheduler.stop();
  });

  it('skips ticks when the tab is hidden to avoid resume note pile-up', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    try {
      const scheduler = new LookAheadAudioScheduler();
      const tick = vi.fn();
      scheduler.start(tick);

      pumpFrame();
      expect(tick).not.toHaveBeenCalled();
      scheduler.stop();
    } finally {
      delete (document as unknown as Record<string, unknown>).hidden;
    }
  });

  it('keeps ticking with a wide horizon while hidden when backgroundLookAheadSec is set', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    try {
      const scheduler = new LookAheadAudioScheduler();
      const ticks: Array<{ horizonSec: number; nowSec: number }> = [];
      scheduler.start((horizonSec, nowSec) => ticks.push({ horizonSec, nowSec }), {
        lookAheadSec: 1,
        backgroundLookAheadSec: 4,
      });

      pumpFrame();
      expect(ticks).toHaveLength(1);
      // Hidden + background: schedule far ahead so a ~1 Hz wakeup never gaps.
      expect(ticks[0].horizonSec - ticks[0].nowSec).toBeCloseTo(4, 5);
      scheduler.stop();
    } finally {
      delete (document as unknown as Record<string, unknown>).hidden;
    }
  });

  it('drives ticks via a timer while hidden (rAF pauses in background tabs)', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    try {
      const scheduler = new LookAheadAudioScheduler();
      const tick = vi.fn();
      scheduler.start(tick, { backgroundLookAheadSec: 4 });

      // Simulate a real hidden tab: rAF never fires. The interval must still schedule.
      rafCallbacks = [];
      tick.mockClear();
      vi.advanceTimersByTime(1100); // a couple of background intervals
      expect(tick).toHaveBeenCalled();
      scheduler.stop();
    } finally {
      delete (document as unknown as Record<string, unknown>).hidden;
    }
  });

  it('clears the background timer on stop', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    try {
      const scheduler = new LookAheadAudioScheduler();
      const tick = vi.fn();
      scheduler.start(tick, { backgroundLookAheadSec: 4 });
      scheduler.stop();

      tick.mockClear();
      vi.advanceTimersByTime(2000);
      expect(tick).not.toHaveBeenCalled();
    } finally {
      delete (document as unknown as Record<string, unknown>).hidden;
    }
  });

  it('creates no background timer for a default (non-background) transport', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    try {
      const scheduler = new LookAheadAudioScheduler();
      const tick = vi.fn();
      scheduler.start(tick); // no backgroundLookAheadSec

      rafCallbacks = [];
      vi.advanceTimersByTime(2000);
      expect(tick).not.toHaveBeenCalled(); // still skips while hidden, no timer
      scheduler.stop();
    } finally {
      delete (document as unknown as Record<string, unknown>).hidden;
    }
  });

  it('stop() halts further ticks', () => {
    const scheduler = new LookAheadAudioScheduler();
    const tick = vi.fn();
    const token = scheduler.start(tick);
    expect(scheduler.isSessionValid(token)).toBe(true);

    pumpFrame();
    expect(tick).toHaveBeenCalledOnce();

    scheduler.stop();
    pumpFrame();
    expect(tick).toHaveBeenCalledOnce();
  });

  it('restarting invalidates the previous session token', () => {
    const scheduler = new LookAheadAudioScheduler();
    const first = scheduler.start(vi.fn());
    const second = scheduler.start(vi.fn());
    expect(scheduler.isSessionValid(first)).toBe(false);
    expect(scheduler.isSessionValid(second)).toBe(true);
    scheduler.stop();
  });

  it('stop() clears pending scheduled callbacks', () => {
    const scheduler = new LookAheadAudioScheduler();
    scheduler.start(vi.fn());
    const cb = vi.fn();
    scheduler.scheduleCallback(100, cb);
    scheduler.stop();
    vi.advanceTimersByTime(500);
    expect(cb).not.toHaveBeenCalled();
  });

  it('runs scheduled callbacks after their delay while active', () => {
    const scheduler = new LookAheadAudioScheduler();
    scheduler.start(vi.fn());
    const cb = vi.fn();
    scheduler.scheduleCallback(100, cb);
    vi.advanceTimersByTime(99);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(cb).toHaveBeenCalledOnce();
    scheduler.stop();
  });
});
