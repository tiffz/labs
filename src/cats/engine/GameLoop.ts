import { SystemRunner, World } from './ECS';

export class GameLoop {
  private rafId: number | null = null;
  private lastTs: number | null = null;
  private world: World;
  private systems: SystemRunner;

  constructor(world: World, systems: SystemRunner) {
    this.world = world;
    this.systems = systems;
  }

  start() {
    if (this.rafId) return;
    const tick = (ts: number) => {
      if (this.lastTs == null) this.lastTs = ts;
      const dtMsRaw = ts - this.lastTs;
      const dtClamped = Math.min(25, dtMsRaw);
      this.lastTs = ts;
      this.world.debug.dtMs = Math.round(dtClamped);

      this.systems.step(this.world, dtClamped);

      if (typeof window !== 'undefined') {
        try {
          const dbg = this.world.debug;
          const out = {
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


