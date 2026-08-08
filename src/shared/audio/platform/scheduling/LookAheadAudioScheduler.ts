import { PreciseScheduler } from '../../preciseScheduler';
import { registerDiagnosticScheduler } from '../../../playback/audioDiagnostics';

export const DEFAULT_LOOK_AHEAD_SEC = 0.25;
/**
 * Chart / section-loop transports schedule whole measures and may await asset
 * readiness once — keep a deeper horizon so a single slow frame cannot starve
 * the next measure boundary.
 */
export const CHART_LOOK_AHEAD_SEC = 1.0;
/**
 * Look-ahead horizon while a background-capable transport is hidden. A background tab
 * pauses rAF and throttles timers to ~1 Hz, so a hidden tick must schedule far enough
 * ahead that audio never gaps before the next ~1 Hz wakeup. Safe now that chart
 * playback drops any overdue backlog through the single late gate (ADR 0025) instead
 * of clamping it to a frozen clock and blasting it on resume.
 */
export const CHART_BACKGROUND_LOOK_AHEAD_SEC = 4.0;
/** @deprecated Superseded by CHART_BACKGROUND_LOOK_AHEAD_SEC. */
export const HIDDEN_TAB_LOOK_AHEAD_SEC = 3.5;

/** Background timer cadence. Foreground rAF drives at ~60 Hz; a hidden tab throttles
 *  this to roughly 1 Hz, which the wide background horizon covers. */
const BACKGROUND_TICK_INTERVAL_MS = 500;

export type LookAheadSchedulerStartOptions = {
  lookAheadSec?: number;
  /**
   * Opt in to background playback. When set, the transport keeps scheduling while the
   * tab is hidden (driven by a timer, since rAF pauses in background tabs) using this
   * wider horizon. Omit for the default "skip while hidden" behavior that metronome,
   * backing-beat, and other non-chart consumers rely on.
   */
  backgroundLookAheadSec?: number;
};

/**
 * Shared rAF + PreciseScheduler wrapper for look-ahead Web Audio scheduling.
 */
export class LookAheadAudioScheduler {
  private scheduler = new PreciseScheduler();
  private tickFn: ((horizonSec: number, nowSec: number) => void) | null = null;
  private sessionToken = 0;
  /** Live-diagnostics registration; present only while a session is running. */
  private unregisterDiagnostics: (() => void) | null = null;
  /** Background driver; present only for a background-capable session (rAF pauses when hidden). */
  private backgroundTimerId: number | null = null;

  start(
    tick: (horizonSec: number, nowSec: number) => void,
    options?: LookAheadSchedulerStartOptions,
  ): number {
    this.stop();
    this.sessionToken = this.scheduler.beginSession();
    // Register while playing so the diagnostics snapshot counts only live transports.
    this.unregisterDiagnostics = registerDiagnosticScheduler(this.scheduler);
    this.tickFn = tick;
    const lookAhead = options?.lookAheadSec ?? DEFAULT_LOOK_AHEAD_SEC;
    const backgroundLookAhead = options?.backgroundLookAheadSec;

    const runTick = () => {
      if (!this.tickFn) return;
      const hidden = typeof document !== 'undefined' && document.hidden;
      // Default (non-background) transports skip ticks while hidden: their clock may
      // freeze and clamping overdue notes to a frozen clock blasts them on resume.
      // A background-capable transport (backgroundLookAhead set) keeps scheduling —
      // safe because the chart late gate drops any overdue backlog (ADR 0025).
      if (hidden && backgroundLookAhead === undefined) return;
      const horizon = hidden ? (backgroundLookAhead ?? lookAhead) : lookAhead;
      const now = performance.now() / 1000;
      this.tickFn(now + horizon, now);
    };

    this.scheduler.startLoop(runTick);

    if (backgroundLookAhead !== undefined) {
      // rAF pauses entirely in a hidden tab, so a timer must drive scheduling there.
      // Guarded to hidden so it never double-drives the foreground rAF loop.
      this.backgroundTimerId = window.setInterval(() => {
        if (typeof document !== 'undefined' && !document.hidden) return;
        runTick();
      }, BACKGROUND_TICK_INTERVAL_MS);
    }

    return this.sessionToken;
  }

  stop(): void {
    this.tickFn = null;
    this.scheduler.stop();
    if (this.backgroundTimerId !== null) {
      window.clearInterval(this.backgroundTimerId);
      this.backgroundTimerId = null;
    }
    this.unregisterDiagnostics?.();
    this.unregisterDiagnostics = null;
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
