import type { World } from '../ECS';
import { catCoordinateSystem } from '../../services/CatCoordinateSystem';
import { computeShadowLayout } from '../../services/ShadowLayout';

// Projects entity transform into screen and computes shadow layout for cats
export const ShadowSystem = (world: World, _dtMs: number): void => {
  void _dtMs; // mark as used to satisfy lint without changing System signature
  for (const [id] of world.cats.entries()) {
    const t = world.transforms.get(id);
    if (!t) continue;
    const ground = catCoordinateSystem.catToScreen({ x: t.x, y: 0, z: t.z });
    const layout = computeShadowLayout(ground);
    world.shadows.set(id, { layout, centerY: ground.y });
  }
};


