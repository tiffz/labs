import type { World } from '../ECS';

// Basic integrator for Velocity3 → Transform3
export const MovementSystem = (world: World, dtMs: number): void => {
  const dt = dtMs / 1000;
  for (const [id, v] of world.velocities.entries()) {
    const t = world.transforms.get(id);
    if (!t) continue;
    world.transforms.set(id, {
      x: t.x + v.vx * dt,
      y: Math.max(0, t.y + v.vy * dt),
      z: t.z + v.vz * dt,
      scale: t.scale,
    });
  }
};


