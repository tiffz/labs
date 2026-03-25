export interface SchedulerOptions {
  intervalMs?: number;
}

/**
 * Small reusable scheduler for playback loops.
 * Keeps setInterval handling centralized and testable.
 */
export class PlaybackScheduler {
  private intervalId: number | null = null;
  private readonly intervalMs: number;
  private readonly callback: () => void;

  constructor(callback: () => void, options: SchedulerOptions = {}) {
    this.callback = callback;
    this.intervalMs = options.intervalMs ?? 50;
  }

  start(): void {
    this.stop();
    this.intervalId = window.setInterval(() => {
      this.callback();
    }, this.intervalMs);
  }

  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }
}

