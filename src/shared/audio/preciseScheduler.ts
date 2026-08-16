/**
 * PreciseScheduler — shared utility for robust Web Audio scheduling.
 *
 * Provides the common infrastructure that any rAF + AudioContext look-ahead
 * engine needs: loop management, async race protection, source/timeout
 * tracking, and clean gain ramp-down on stop.
 *
 * This is a composition utility — engines hold an instance and delegate
 * lifecycle calls rather than extending a base class.
 */
export class PreciseScheduler {
  private generation = 0;
  private rafId: number | null = null;
  private timerId: number | null = null;
  private tickFn: (() => void) | null = null;
  private onVisibilityChange: (() => void) | null = null;
  private activeSources = new Set<AudioBufferSourceNode>();
  private pendingTimeouts = new Set<number>();

  /**
   * Increment and return a session token. After async work, call
   * isSessionValid(token) to check whether the session was cancelled.
   */
  beginSession(): number {
    return ++this.generation;
  }

  /** Returns true if the given token matches the current generation. */
  isSessionValid(token: number): boolean {
    return this.generation === token;
  }

  /**
   * How often to tick while hidden. Browsers clamp timers in background tabs to roughly 1 Hz, so
   * this is a floor, not a guarantee — engines must widen their look-ahead horizon to cover a full
   * second between wakeups. `RhythmPlayer.LOOK_AHEAD_HIDDEN_SEC` and `HIDDEN_TAB_LOOK_AHEAD_SEC`
   * are both 3.5s for this reason.
   */
  private static readonly HIDDEN_TICK_MS = 250;

  /**
   * Start a look-ahead loop that calls `tick` repeatedly.
   *
   * Driven by requestAnimationFrame while the tab is visible, and by a timer while it is hidden,
   * swapping automatically on `visibilitychange`.
   *
   * The timer is not optional: a hidden tab stops firing rAF altogether while leaving the
   * AudioContext running, so a rAF-only loop stops scheduling and the sound dies as soon as the
   * already-queued look-ahead drains. That was "switching tabs mutes the drums". Engines had grown
   * widened hidden-tab horizons to cope, but those live inside `tick` — the very thing that stopped
   * running — so they could never take effect.
   */
  startLoop(tick: () => void): void {
    this.stopLoop();
    this.tickFn = tick;
    this.onVisibilityChange = () => this.driveLoop();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
    this.driveLoop();
  }

  /** (Re)attach the driver that suits the current visibility state. Exactly one runs at a time. */
  private driveLoop(): void {
    this.clearDrivers();
    const tick = this.tickFn;
    if (!tick) return;

    if (typeof document !== 'undefined' && document.hidden) {
      this.timerId = window.setInterval(tick, PreciseScheduler.HIDDEN_TICK_MS);
      // Schedule immediately rather than waiting a full interval, so the gap across the
      // visible -> hidden transition is never longer than it has to be.
      tick();
      return;
    }

    const loop = () => {
      tick();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  /** Cancel whichever driver is running, leaving `tickFn` in place. */
  private clearDrivers(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /** Cancel the loop and stop listening for visibility changes. */
  stopLoop(): void {
    this.clearDrivers();
    this.tickFn = null;
    if (this.onVisibilityChange && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    this.onVisibilityChange = null;
  }

  /**
   * Track an AudioBufferSourceNode so it can be stopped on cleanup.
   * Automatically untracked when the source ends.
   */
  trackSource(source: AudioBufferSourceNode): void {
    this.activeSources.add(source);
    const prev = source.onended;
    source.onended = (ev) => {
      this.activeSources.delete(source);
      if (typeof prev === 'function') prev.call(source, ev);
    };
  }

  /** Stop and untrack all active audio sources. */
  stopAllSources(): void {
    for (const source of this.activeSources) {
      try { source.stop(); } catch { /* already stopped */ }
      try { source.disconnect(); } catch { /* already disconnected */ }
    }
    this.activeSources.clear();
  }

  /** Schedule a callback via setTimeout with automatic tracking. */
  scheduleCallback(delayMs: number, fn: () => void): number {
    const id = window.setTimeout(() => {
      this.pendingTimeouts.delete(id);
      fn();
    }, delayMs);
    this.pendingTimeouts.add(id);
    return id;
  }

  /** Clear all tracked setTimeout callbacks. */
  clearAllCallbacks(): void {
    for (const id of this.pendingTimeouts) {
      window.clearTimeout(id);
    }
    this.pendingTimeouts.clear();
  }

  /**
   * Ramp a list of GainNodes to 0 over `durationSec` seconds for a
   * clean cutoff (avoids clicks). Pass the AudioContext for timing.
   */
  rampDown(ctx: AudioContext, gainNodes: GainNode[], durationSec = 0.02): void {
    const now = ctx.currentTime;
    for (const node of gainNodes) {
      try {
        node.gain.cancelScheduledValues(now);
        node.gain.setValueAtTime(node.gain.value, now);
        node.gain.linearRampToValueAtTime(0, now + durationSec);
      } catch { /* node may be disconnected */ }
    }
  }

  /** Full stop: cancel loop, silence sources, clear callbacks. */
  stop(): void {
    this.stopLoop();
    this.stopAllSources();
    this.clearAllCallbacks();
  }

  /** Number of currently tracked sources (useful for testing). */
  get activeSourceCount(): number {
    return this.activeSources.size;
  }

  /** Number of pending tracked timeouts (useful for testing). */
  get pendingCallbackCount(): number {
    return this.pendingTimeouts.size;
  }
}
