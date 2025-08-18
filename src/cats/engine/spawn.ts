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

export function spawnCounter(world: World, initial: { x: number; y: number; z: number }): EntityId {
  return spawnFurniture(world, initial, 'counter');
}

export function spawnDoor(world: World, initial: { x: number; y: number; z: number }): EntityId {
  return spawnFurniture(world, initial, 'door');
}

export function spawnWindow(world: World, initial: { x: number; y: number; z: number }): EntityId {
  return spawnFurniture(world, initial, 'window');
}

export function spawnRug(world: World, initial: { x: number; y: number; z: number }): EntityId {
  return spawnFurniture(world, initial, 'rug');
}

export function spawnLamp(world: World, initial: { x: number; y: number; z: number }): EntityId {
  return spawnFurniture(world, initial, 'lamp');
}

export function spawnBookshelf(world: World, initial: { x: number; y: number; z: number }): EntityId {
  return spawnFurniture(world, initial, 'bookshelf');
}

export function spawnPainting(world: World, initial: { x: number; y: number; z: number }, variant: 'cat' | 'abstract' = 'cat', size: 'small' | 'large' = 'large'): EntityId {
  const id = world.entities.create();
  world.transforms.set(id, { x: initial.x, y: initial.y, z: initial.z });
  world.renderables.set(id, { kind: `painting-${variant}-${size}` });
  return id;
}


