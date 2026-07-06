import { PreciseScheduler } from '../../preciseScheduler';

export const DEFAULT_LOOK_AHEAD_SEC = 0.25;
export const HIDDEN_TAB_LOOK_AHEAD_SEC = 3.5;

/**
 * Shared rAF + PreciseScheduler wrapper for look-ahead Web Audio scheduling.
 */
export class LookAheadAudioScheduler {
  private scheduler = new PreciseScheduler();
  private tickFn: ((horizonSec: number, nowSec: number) => void) | null = null;
  private sessionToken = 0;

  start(tick: (horizonSec: number, nowSec: number) => void): number {
    this.stop();
    this.sessionToken = this.scheduler.beginSession();
    this.tickFn = tick;
    this.scheduler.startLoop(() => {
      if (!this.tickFn) return;
      const hidden = typeof document !== 'undefined' && document.hidden;
      const lookAhead = hidden ? HIDDEN_TAB_LOOK_AHEAD_SEC : DEFAULT_LOOK_AHEAD_SEC;
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
