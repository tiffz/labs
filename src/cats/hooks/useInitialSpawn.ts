import { useRef } from 'react';
import type { World } from '../engine';
import { spawnCat, spawnFurniture, spawnCouch, spawnCounter, spawnDoor, spawnWindow, spawnRug, spawnLamp, spawnBookshelf, spawnPainting } from '../engine/spawn';

/**
 * Ensures a cat entity and initial furniture set exist in the ECS world.
 * Runs only once per mount (idempotent if entities already exist).
 */
export function useInitialSpawn(world: World, catPosition: { x: number; y: number; z: number }) {
  const spawnedRef = useRef(false);

  if (!spawnedRef.current) {
    const existing = Array.from(world.renderables.entries()).find(([, r]) => r.kind === 'cat');
    if (!existing) {
      spawnCat(world, catPosition);

      const existingFurniture = Array.from(world.renderables.entries()).find(([, r]) => r.kind === 'furniture');
      if (!existingFurniture) {
        spawnWindow(world, { x: 600, y: 180, z: 0 });
        spawnDoor(world, { x: 850, y: 0, z: 0 });
        spawnPainting(world, { x: 200, y: 180, z: 0 }, 'cat', 'large');
        spawnPainting(world, { x: 1000, y: 160, z: 0 }, 'abstract', 'small');
        spawnCounter(world, { x: 1200, y: 0, z: 0 });
        spawnBookshelf(world, { x: 160, y: 0, z: 0 });
        spawnFurniture(world, { x: 900, y: 0, z: 300 });
        spawnCouch(world, { x: 400, y: 0, z: 200 });
        spawnRug(world, { x: 700, y: 0, z: 720 });
        spawnLamp(world, { x: 750, y: 0, z: 250 });
      }
    }
    spawnedRef.current = true;
  }
}
