import type { System } from '../ECS';

// Applies an upward impulse to cats when happyJump intent is set.
// Relies on MovementSystem gravity to create an arc and settle back to ground.
export const JumpImpulseSystem: System = (world) => {
  for (const [id] of world.cats.entries()) {
    const intent = world.catIntents.get(id) || {};
    if (intent.happyJump) {
      const v = world.velocities.get(id) || { vx: 0, vy: 0, vz: 0 };
      // Only trigger impulse if on/near ground to avoid stacking mid-air
      const t = world.transforms.get(id);
      if (t && (t.y <= 0.5 || Math.abs(v.vy) < 1)) {
        // If already moving vertically, blend toward target impulse to avoid sudden pops
        // Slightly lower target for smoother arc; blend more toward current to avoid pops
        const target = 260;
        const blendedVy = Math.abs(v.vy) > 1 ? (v.vy * 0.6 + target * 0.4) : target;
        world.velocities.set(id, { ...v, vy: blendedVy });
        try {
          const dbg = (world as unknown as { __debug?: Record<string, unknown> }).__debug || {};
          const key = String(id);
          (dbg as { lastImpulse?: Record<string, { vy: number; ts: number }> }).lastImpulse = {
            ...(dbg as { lastImpulse?: Record<string, { vy: number; ts: number }> }).lastImpulse,
            [key]: { vy: blendedVy, ts: performance.now() },
          };
          (world as unknown as { __debug?: Record<string, unknown> }).__debug = dbg;
        } catch {
          // no-op
        }
      }
      // Clear the edge-triggered intent immediately
      world.catIntents.set(id, { ...intent, happyJump: false });
    }
  }
};


