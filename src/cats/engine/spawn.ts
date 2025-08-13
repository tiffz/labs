import { World } from './ECS';
import type { EntityId } from './ECS';

export function spawnCat(world: World, initial: { x: number; y: number; z: number }): EntityId {
  const id = world.entities.create();
  world.transforms.set(id, { x: initial.x, y: initial.y, z: initial.z });
  world.renderables.set(id, { kind: 'cat' });
  world.shadows.set(id, {});
  world.cats.set(id, { state: 'idle' });
  world.catIntents.set(id, {});
  return id;
}

export function spawnFurniture(
  world: World,
  initial: { x: number; y: number; z: number },
  kind: string = 'furniture'
): EntityId {
  const id = world.entities.create();
  world.transforms.set(id, { x: initial.x, y: initial.y, z: initial.z });
  world.renderables.set(id, { kind });
  return id;
}

export function spawnCouch(world: World, initial: { x: number; y: number; z: number }): EntityId {
  return spawnFurniture(world, initial, 'couch');
}


