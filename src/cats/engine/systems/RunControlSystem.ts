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
    const v = world.velocities.get(id) || { vx: 0, vy: 0, vz: 0 };
    // Smooth deceleration: when no input, damp vx to avoid a jarring snap-stop
    const nextVx = speedX !== 0 ? speedX : (Math.abs(v.vx) < 10 ? 0 : v.vx * 0.75);
    let nextVz = v.vz;
    if (ctrl.moveZ && ctrl.moveZ !== 0) {
      nextVz = speedZ;
    } else if (!isPounceActive) {
      // Aggressively damp residual Z drift to prevent scale/z-index oscillation
      nextVz = Math.abs(v.vz) < 5 ? 0 : v.vz * 0.7;
    }
    world.velocities.set(id, { vx: nextVx, vy: v.vy, vz: nextVz });
    // Publish debug speeds for DevPanel visibility
    if (speedX !== 0 || speedZ !== 0) {
      try {
        world.debug.runSpeedX = speedX;
        world.debug.runSpeedZ = speedZ;
        world.debug.runSpeed = Math.hypot(speedX, speedZ);
        world.debug.lastRunInput = { id, moveX: ctrl.moveX || 0, moveZ: ctrl.moveZ || 0, ts: performance.now() };
      } catch {
        // no-op
      }
    }
    // Clear one-shot intent; App feeds again while keys are held
    world.runControls.set(id, { moveX: 0, moveZ: 0, boost: ctrl.boost });
  }
};


