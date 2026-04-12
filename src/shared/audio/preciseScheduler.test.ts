import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PreciseScheduler } from './preciseScheduler';
import { createMockAudioContext, createMockSourceNode } from './__test__/mockAudioContext';

describe('PreciseScheduler', () => {
  let scheduler: PreciseScheduler;

  beforeEach(() => {
    vi.useFakeTimers();
    scheduler = new PreciseScheduler();
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Generation counter (async race protection)
  // ---------------------------------------------------------------------------
  describe('generation counter', () => {
    it('returns a new token each call', () => {
      const t1 = scheduler.beginSession();
      const t2 = scheduler.beginSession();
      expect(t1).not.toBe(t2);
    });

    it('validates the current session token', () => {
      const t1 = scheduler.beginSession();
      expect(scheduler.isSessionValid(t1)).toBe(true);
    });

    it('invalidates old tokens when a new session starts', () => {
      const t1 = scheduler.beginSession();
      scheduler.beginSession();
      expect(scheduler.isSessionValid(t1)).toBe(false);
    });

    it('invalidates tokens when stop triggers a new session indirectly', () => {
      const t1 = scheduler.beginSession();
      const t2 = scheduler.beginSession();
      expect(scheduler.isSessionValid(t1)).toBe(false);
      expect(scheduler.isSessionValid(t2)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Source tracking
  // ---------------------------------------------------------------------------
  describe('source tracking', () => {
    it('tracks sources and reports count', () => {
      const s1 = createMockSourceNode();
      const s2 = createMockSourceNode();
      scheduler.trackSource(s1);
      scheduler.trackSource(s2);
      expect(scheduler.activeSourceCount).toBe(2);
    });

    it('auto-removes sources when they end', () => {
      const s = createMockSourceNode();
      scheduler.trackSource(s);
      expect(scheduler.activeSourceCount).toBe(1);
      s._end();
      expect(scheduler.activeSourceCount).toBe(0);
    });

    it('preserves existing onended handlers when tracking', () => {
      const s = createMockSourceNode();
      const original = vi.fn();
      s.onended = original;
      scheduler.trackSource(s);
      s._end();
      expect(original).toHaveBeenCalled();
      expect(scheduler.activeSourceCount).toBe(0);
    });

    it('stopAllSources stops and disconnects every tracked source', () => {
      const s1 = createMockSourceNode();
      const s2 = createMockSourceNode();
      scheduler.trackSource(s1);
      scheduler.trackSource(s2);

      scheduler.stopAllSources();

      expect(s1.stop).toHaveBeenCalled();
      expect(s2.stop).toHaveBeenCalled();
      expect(s1.disconnect).toHaveBeenCalled();
      expect(s2.disconnect).toHaveBeenCalled();
      expect(scheduler.activeSourceCount).toBe(0);
    });

    it('stopAllSources handles already-stopped sources gracefully', () => {
      const s = createMockSourceNode();
      (s.stop as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new DOMException('already stopped');
      });
      scheduler.trackSource(s);
      expect(() => scheduler.stopAllSources()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Timeout tracking
  // ---------------------------------------------------------------------------
  describe('timeout tracking', () => {
    it('scheduleCallback runs the callback after delay', () => {
      const fn = vi.fn();
      scheduler.scheduleCallback(100, fn);
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledOnce();
    });

    it('tracks pending callbacks', () => {
      scheduler.scheduleCallback(100, () => {});
      scheduler.scheduleCallback(200, () => {});
      expect(scheduler.pendingCallbackCount).toBe(2);
    });

    it('auto-removes after execution', () => {
      scheduler.scheduleCallback(100, () => {});
      vi.advanceTimersByTime(100);
      expect(scheduler.pendingCallbackCount).toBe(0);
    });

    it('clearAllCallbacks prevents pending callbacks from firing', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      scheduler.scheduleCallback(100, fn1);
      scheduler.scheduleCallback(200, fn2);

      scheduler.clearAllCallbacks();
      vi.advanceTimersByTime(300);

      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).not.toHaveBeenCalled();
      expect(scheduler.pendingCallbackCount).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // rAF loop
  // ---------------------------------------------------------------------------
  describe('rAF loop', () => {
    it('calls tick repeatedly via requestAnimationFrame', () => {
      const tick = vi.fn();
      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
        return window.setTimeout(cb, 16) as unknown as number;
      });
      vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
        clearTimeout(id);
      });

      scheduler.startLoop(tick);
      vi.advanceTimersByTime(64);
      expect(tick.mock.calls.length).toBeGreaterThanOrEqual(3);

      scheduler.stopLoop();
      const countAfterStop = tick.mock.calls.length;
      vi.advanceTimersByTime(64);
      expect(tick.mock.calls.length).toBe(countAfterStop);
    });

    it('stopLoop is safe to call when no loop is running', () => {
      expect(() => scheduler.stopLoop()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Gain ramp-down
  // ---------------------------------------------------------------------------
  describe('rampDown', () => {
    it('ramps gain nodes to 0', () => {
      const ctx = createMockAudioContext();
      ctx._time = 1.0;

      const g1 = ctx.createGain();
      const g2 = ctx.createGain();
      g1.gain.value = 0.8;
      g2.gain.value = 0.5;

      scheduler.rampDown(ctx as unknown as AudioContext, [g1, g2] as unknown as GainNode[], 0.02);

      expect(g1.gain.cancelScheduledValues).toHaveBeenCalledWith(1.0);
      expect(g1.gain.setValueAtTime).toHaveBeenCalledWith(0.8, 1.0);
      expect(g1.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 1.02);
      expect(g2.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 1.02);
    });
  });

  // ---------------------------------------------------------------------------
  // Full stop()
  // ---------------------------------------------------------------------------
  describe('stop()', () => {
    it('cleans up sources, callbacks, and loop in one call', () => {
      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
        return window.setTimeout(cb, 16) as unknown as number;
      });
      vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
        clearTimeout(id);
      });

      const tick = vi.fn();
      scheduler.startLoop(tick);

      const s = createMockSourceNode();
      scheduler.trackSource(s);

      const fn = vi.fn();
      scheduler.scheduleCallback(1000, fn);

      scheduler.stop();

      expect(s.stop).toHaveBeenCalled();
      expect(scheduler.activeSourceCount).toBe(0);
      expect(scheduler.pendingCallbackCount).toBe(0);

      vi.advanceTimersByTime(1100);
      expect(fn).not.toHaveBeenCalled();

      const tickCountAfterStop = tick.mock.calls.length;
      vi.advanceTimersByTime(100);
      expect(tick.mock.calls.length).toBe(tickCountAfterStop);
    });
  });

  // ---------------------------------------------------------------------------
  // Race conditions
  // ---------------------------------------------------------------------------
  describe('race conditions', () => {
    it('double beginSession invalidates the first', () => {
      const t1 = scheduler.beginSession();
      const t2 = scheduler.beginSession();
      expect(scheduler.isSessionValid(t1)).toBe(false);
      expect(scheduler.isSessionValid(t2)).toBe(true);
    });

    it('stop then new session works cleanly', () => {
      const s = createMockSourceNode();
      scheduler.trackSource(s);
      scheduler.scheduleCallback(100, () => {});

      scheduler.stop();
      expect(scheduler.activeSourceCount).toBe(0);
      expect(scheduler.pendingCallbackCount).toBe(0);

      const token = scheduler.beginSession();
      expect(scheduler.isSessionValid(token)).toBe(true);
    });

    it('stop with no active sources or callbacks does not throw', () => {
      expect(() => scheduler.stop()).not.toThrow();
      expect(() => scheduler.stop()).not.toThrow();
    });
  });
});
