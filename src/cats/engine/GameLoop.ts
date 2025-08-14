import { SystemRunner, World } from './ECS';

export class GameLoop {
  private rafId: number | null = null;
  private lastTs: number | null = null;

  constructor(private world: World, private systems: SystemRunner) {}

  start() {
    if (this.rafId) return;
    const tick = (ts: number) => {
      if (this.lastTs == null) this.lastTs = ts;
      const dtMsRaw = ts - this.lastTs;
      // Clamp overall delta, then integrate in smaller fixed sub-steps to avoid big physics jumps
      // Clamp to 25ms for tighter responsiveness
      const dtClamped = Math.min(25, dtMsRaw);
      this.lastTs = ts;
      (this.world as unknown as { __debug?: Record<string, unknown> }).__debug = {
        ...(this.world as unknown as { __debug?: Record<string, unknown> }).__debug,
        dtMs: Math.round(dtClamped),
      };
      let remaining = dtClamped;
      // Use 10ms sub-steps (~100Hz) for smooth arcs without excessive CPU
      const subStep = 10; // ms
      while (remaining > 0) {
        const step = Math.min(subStep, remaining);
      this.systems.step(this.world, step);
        remaining -= step;
      }
      // Publish simplified ECS debug snapshot for HUD/DevPanel
      if (typeof window !== 'undefined') {
        try {
          const dbg = (this.world as unknown as { __debug?: Record<string, unknown> }).__debug || {};
          const out = {
            // Prefer DOM walking when available
            walking: typeof dbg.domWalkingClass === 'boolean' ? dbg.domWalkingClass : (typeof dbg.walking === 'boolean' ? dbg.walking : false),
            bobAmpl: typeof dbg.bobAmpl === 'string' ? dbg.bobAmpl : (typeof dbg.domBobAmpl === 'string' ? dbg.domBobAmpl : ''),
            speedCompInst: typeof dbg.walkSpeedInst === 'number' ? dbg.walkSpeedInst : (typeof dbg.walkSpeedComp === 'number' ? dbg.walkSpeedComp : 0),
            speedCompSmooth: typeof dbg.walkSpeedComp === 'number' ? dbg.walkSpeedComp : (typeof dbg.walkSpeedScreen === 'number' ? dbg.walkSpeedScreen : 0),
            cameraTx: typeof dbg.cameraTx === 'number' ? dbg.cameraTx : 0,
            dtMs: Math.round(dtClamped),
            pouncePhase: dbg.pouncePhase || undefined,
            lastImpulse: dbg.lastImpulse || undefined,
          };
          (window as unknown as { __ECS_DEBUG__?: unknown }).__ECS_DEBUG__ = out as unknown;
        } catch {
          // ignore debug publishing errors
        }
      }
      // Notify React layer that world has advanced (for lightweight subscriptions)
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('world-tick'));
        } catch {
          // ignore dispatch errors in non-browser envs
        }
      }
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


