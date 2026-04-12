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

  /** Start a requestAnimationFrame loop that calls `tick` each frame. */
  startLoop(tick: () => void): void {
    this.stopLoop();
    const loop = () => {
      tick();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  /** Cancel the rAF loop. */
  stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
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
