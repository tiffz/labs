import type { World } from '../ECS';
import { catCoordinateSystem } from '../../services/CatCoordinateSystem';

// Basic integrator for Velocity3 → Transform3
export const MovementSystem = (world: World, dtMs: number): void => {
  const dt = dtMs / 1000;
  // Gravity tuned for a snappier apex without lingering
  const GRAVITY = -640; // px/sec^2
  for (const [id, v] of world.velocities.entries()) {
    const t = world.transforms.get(id);
    if (!t) continue;
    // Apply gravity for cats only; furniture has no velocity entry
    const isCat = !!world.cats.get(id);
    const vyAfter = isCat ? v.vy + GRAVITY * dt : v.vy;
    // Semi-implicit Euler without extra damping to avoid apex stall
    const nextY = t.y + vyAfter * dt;
    // Ground collision: detect crossing the ground, not exact zero, to avoid apex stalls with small dt
    const crossedGround = t.y > 0 && nextY <= 0;
    const clampedY = Math.max(0, nextY);
    const landed = crossedGround || (clampedY === 0 && nextY <= 0);
    // Clamp X to logical world bounds, not viewport size
    const worldDims = catCoordinateSystem.getWorldDimensions();
    const bounds = { minX: 0, maxX: worldDims.width };
    const nextX = t.x + v.vx * dt;
    const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, nextX));

    world.transforms.set(id, {
      x: clampedX,
      y: clampedY,
      z: t.z + v.vz * dt,
      scale: t.scale,
    });
    world.velocities.set(id, { vx: v.vx, vy: landed ? 0 : vyAfter, vz: v.vz });
  }
};


