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
    const nextZ = t.z + v.vz * dt;
    
    // Lightweight collision detection for cats (performance optimized)
    if (isCat) {
      // Prevent cat from going behind wall-mounted furniture by adding wall buffer
      const wallBuffer = 30; // Minimum distance from wall (z=0)
      const minZ = wallBuffer; // Cat cannot go closer to wall than this
      const clampedZ = Math.max(minZ, Math.min(catCoordinateSystem.getWorldDimensions().depth, nextZ));
      
      const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, nextX));
      world.transforms.set(id, { x: clampedX, y: clampedY, z: clampedZ, scale: t.scale });
      world.velocities.set(id, { vx: v.vx, vy: landed ? 0 : vyAfter, vz: v.vz });
      return; // Early return for cats with wall collision
    }
    
    // Non-cat entities use normal boundary clamping
    const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, nextX));
    const clampedZ = Math.max(0, Math.min(catCoordinateSystem.getWorldDimensions().depth, nextZ));
    world.transforms.set(id, { x: clampedX, y: clampedY, z: clampedZ, scale: t.scale });
    world.velocities.set(id, { vx: v.vx, vy: landed ? 0 : vyAfter, vz: v.vz });
  }
};


