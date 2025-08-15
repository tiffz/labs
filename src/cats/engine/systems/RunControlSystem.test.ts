import { World } from '../ECS';
import { RunControlSystem } from './RunControlSystem';

describe('RunControlSystem', () => {
  it('applies base speed when not boosted', () => {
    const world = new World();
    const id = world.entities.create();
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.velocities.set(id, { vx: 0, vy: 0, vz: 0 });
    world.renderables.set(id, { kind: 'cat' });
    world.cats.set(id, { state: 'idle' });

    world.runControls.set(id, { moveX: 1, moveZ: 0 });
    RunControlSystem(world, 16);
    const v = world.velocities.get(id)!;
    expect(v.vx).toBe(260);
  });

  it('applies boosted speed when pouncing', () => {
    const world = new World();
    const id = world.entities.create();
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.velocities.set(id, { vx: 0, vy: 0, vz: 0 });
    world.renderables.set(id, { kind: 'cat' });
    world.cats.set(id, { state: 'pouncing' });

    world.runControls.set(id, { moveX: -1, moveZ: 0 });
    RunControlSystem(world, 16);
    const v = world.velocities.get(id)!;
    expect(v.vx).toBe(-900);
  });

  it('applies boosted speed when boost flag is set', () => {
    const world = new World();
    const id = world.entities.create();
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.velocities.set(id, { vx: 0, vy: 0, vz: 0 });
    world.renderables.set(id, { kind: 'cat' });
    world.cats.set(id, { state: 'idle' });

    world.runControls.set(id, { moveX: 1, moveZ: 0, boost: true });
    RunControlSystem(world, 16);
    const v = world.velocities.get(id)!;
    expect(v.vx).toBe(900);
  });
});


