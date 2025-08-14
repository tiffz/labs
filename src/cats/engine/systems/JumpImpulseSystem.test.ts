import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { World, SystemRunner } from '../index';
import { JumpImpulseSystem } from './JumpImpulseSystem';
import { MovementSystem } from './MovementSystem';

describe('JumpImpulseSystem', () => {
  let originalNow: () => number;
  let nowMs = 0;

  beforeEach(() => {
    originalNow = performance.now.bind(performance);
    nowMs = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (performance as any).now = () => nowMs;
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (performance as any).now = originalNow;
  });

  test('applies upward impulse and lands back on ground', () => {
    const world = new World();
    const systems = new SystemRunner();
    systems.add(JumpImpulseSystem);
    systems.add(MovementSystem);

    const id = world.entities.create();
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.renderables.set(id, { kind: 'cat' });
    world.cats.set(id, { state: 'idle' });
    world.velocities.set(id, { vx: 0, vy: 0, vz: 0 });

    // Trigger jump
    world.catIntents.set(id, { happyJump: true });
    systems.step(world, 16);

    // After first step, we should have upward velocity
    const v1 = world.velocities.get(id)!;
    expect(v1.vy).toBeGreaterThan(0);

    // Integrate for some time; y should go up then return to 0
    for (let i = 0; i < 120; i++) { // simulate ~2 seconds to ensure landing
      nowMs += 16;
      systems.step(world, 16);
    }
    const tFinal = world.transforms.get(id)!;
    const vFinal = world.velocities.get(id)!;
    expect(tFinal.y).toBeCloseTo(0);
    expect(vFinal.vy).toBe(0);
  });

  test('blends with existing vertical velocity for smoothness (ground/near-ground)', () => {
    const world = new World();
    const systems = new SystemRunner();
    systems.add(JumpImpulseSystem);
    systems.add(MovementSystem);

    const id = world.entities.create();
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.renderables.set(id, { kind: 'cat' });
    world.cats.set(id, { state: 'idle' });
    // Start with a small upward velocity at ground so impulse is permitted
    world.velocities.set(id, { vx: 0, vy: 50, vz: 0 });
    world.transforms.set(id, { x: 0, y: 0, z: 0 });

    // Trigger jump while already moving up — new vy should increase but not hard reset to target
    world.catIntents.set(id, { happyJump: true });
    systems.step(world, 16);
    const v1 = world.velocities.get(id)!;
    expect(v1.vy).toBeGreaterThan(50);
    expect(v1.vy).toBeLessThan(400);
  });
});


