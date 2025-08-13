import { SystemRunner, World } from './ECS';

export class GameLoop {
  private rafId: number | null = null;
  private lastTs: number | null = null;

  constructor(private world: World, private systems: SystemRunner) {}

  start() {
    if (this.rafId) return;
    const tick = (ts: number) => {
      if (this.lastTs == null) this.lastTs = ts;
      const dtMs = Math.min(32, ts - this.lastTs); // clamp large jumps
      this.lastTs = ts;
      this.systems.step(this.world, dtMs);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.lastTs = null;
  }
}


