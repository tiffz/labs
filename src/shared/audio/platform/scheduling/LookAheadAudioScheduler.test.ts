import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_LOOK_AHEAD_SEC,
  HIDDEN_TAB_LOOK_AHEAD_SEC,
  LookAheadAudioScheduler,
} from './LookAheadAudioScheduler';

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

  it('extends the horizon when the tab is hidden', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    try {
      const scheduler = new LookAheadAudioScheduler();
      const ticks: Array<{ horizonSec: number; nowSec: number }> = [];
      scheduler.start((horizonSec, nowSec) => ticks.push({ horizonSec, nowSec }));

      pumpFrame();
      expect(ticks[0].horizonSec - ticks[0].nowSec).toBeCloseTo(HIDDEN_TAB_LOOK_AHEAD_SEC, 5);
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
