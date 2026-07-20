import { PreciseScheduler } from '../../preciseScheduler';

export const DEFAULT_LOOK_AHEAD_SEC = 0.25;
/**
 * Chart / section-loop transports schedule whole measures and may await asset
 * readiness once — keep a deeper horizon so a single slow frame cannot starve
 * the next measure boundary.
 */
export const CHART_LOOK_AHEAD_SEC = 1.0;
/** @deprecated Hidden tabs skip ticks instead of extending look-ahead (resume pile-up). */
export const HIDDEN_TAB_LOOK_AHEAD_SEC = 3.5;

export type LookAheadSchedulerStartOptions = {
  lookAheadSec?: number;
};

/**
 * Shared rAF + PreciseScheduler wrapper for look-ahead Web Audio scheduling.
 */
export class LookAheadAudioScheduler {
  private scheduler = new PreciseScheduler();
  private tickFn: ((horizonSec: number, nowSec: number) => void) | null = null;
  private sessionToken = 0;

  start(
    tick: (horizonSec: number, nowSec: number) => void,
    options?: LookAheadSchedulerStartOptions,
  ): number {
    this.stop();
    this.sessionToken = this.scheduler.beginSession();
    this.tickFn = tick;
    const lookAhead = options?.lookAheadSec ?? DEFAULT_LOOK_AHEAD_SEC;
    this.scheduler.startLoop(() => {
      if (!this.tickFn) return;
      // When the tab is hidden, browsers often suspend AudioContext (clock freezes)
      // while rAF is heavily throttled. Extending look-ahead into a frozen clock
      // piles notes that all fire on resume — skip ticks instead and let hosts
      // re-anchor via attachTransportVisibilityGuard.
      if (typeof document !== 'undefined' && document.hidden) return;
      const now = performance.now() / 1000;
      this.tickFn(now + lookAhead, now);
    });
    return this.sessionToken;
  }

  stop(): void {
    this.tickFn = null;
    this.scheduler.stop();
  }

  isSessionValid(token: number): boolean {
    return this.scheduler.isSessionValid(token);
  }

  trackSource(source: AudioBufferSourceNode): void {
    this.scheduler.trackSource(source);
  }

  scheduleCallback(delayMs: number, fn: () => void): number {
    return this.scheduler.scheduleCallback(delayMs, fn);
  }
}
