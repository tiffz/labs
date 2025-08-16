import type { World } from '../ECS';
// No direct projection required here

// Applies lateral movement from run controls into transforms, clamped to world bounds
export const RunControlSystem = (world: World, _dtMs: number): void => {
  void _dtMs; // movement is set as velocity; integration happens in MovementSystem
  for (const [id, ctrl] of world.runControls.entries()) {
    if (!world.cats.get(id)) continue;
    const t = world.transforms.get(id);
    if (!t) continue;
    const isPounceActive = world.cats.get(id)?.state === 'pouncePrep' || world.cats.get(id)?.state === 'pouncing' || world.cats.get(id)?.state === 'recover';
    const baseRunSpeedX = 260;
    const pounceBoostRunSpeedX = 900; // much stronger lateral movement during pounce assist for flying pounces
    const useBoost = ctrl.boost === true || isPounceActive;
    const speedX = (ctrl.moveX || 0) * (useBoost ? pounceBoostRunSpeedX : baseRunSpeedX);
    const speedZ = (ctrl.moveZ || 0) * 220;
    // Drive velocities so MovementSystem integrates consistently (and other systems can modify vy/vz)
    const v = world.velocities.get(id) || { vx: 0, vy: 0, vz: 0 };
    const nextVx = speedX;
    let nextVz = v.vz;
    if (ctrl.moveZ && ctrl.moveZ !== 0) {
      nextVz = speedZ;
    } else if (!isPounceActive) {
      // Damp any residual Z drift when not pouncing and no Z input
      nextVz = Math.abs(v.vz) < 1 ? 0 : v.vz * 0.85;
    }
    world.velocities.set(id, { vx: nextVx, vy: v.vy, vz: nextVz });
    // Publish debug speeds for DevPanel visibility
    if (speedX !== 0 || speedZ !== 0) {
      try {
        const dbg = (world as unknown as { __debug?: Record<string, unknown> }).__debug || {};
        (dbg as { runSpeedX?: number }).runSpeedX = speedX;
        (dbg as { runSpeedZ?: number }).runSpeedZ = speedZ;
        (dbg as { runSpeed?: number }).runSpeed = Math.hypot(speedX, speedZ);
        (dbg as { lastRunInput?: unknown }).lastRunInput = { id, moveX: ctrl.moveX || 0, moveZ: ctrl.moveZ || 0, ts: performance.now() };
        (world as unknown as { __debug?: Record<string, unknown> }).__debug = dbg;
      } catch {
        // no-op
      }
    }
    // Clear one-shot intent; App feeds again while keys are held
    world.runControls.set(id, { moveX: 0, moveZ: 0, boost: ctrl.boost });
  }
};


