import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { World, SystemRunner } from '../index';
import { JumpImpulseSystem } from './JumpImpulseSystem';
import { MovementSystem } from './MovementSystem';

describe('JumpImpulseSystem - Double Jump Mechanics', () => {
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

  test('allows double jump when in air', () => {
    const world = new World();
    const systems = new SystemRunner();
    systems.add(JumpImpulseSystem);
    systems.add(MovementSystem);

    const id = world.entities.create();
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.renderables.set(id, { kind: 'cat' });
    world.cats.set(id, { state: 'idle' });
    world.velocities.set(id, { vx: 0, vy: 0, vz: 0 });

    // First jump from ground
    world.catIntents.set(id, { happyJump: true, jumpType: 'powerful' });
    systems.step(world, 16);

    // Cat should be moving upward
    const v1 = world.velocities.get(id)!;
    expect(v1.vy).toBeGreaterThan(0);

    // Simulate some time to get cat in air
    for (let i = 0; i < 10; i++) {
      nowMs += 16;
      systems.step(world, 16);
    }

    // Cat should be in air now
    const t1 = world.transforms.get(id)!;
    expect(t1.y).toBeGreaterThan(0.5);

    // Second jump (double jump) should work
    world.catIntents.set(id, { happyJump: true, jumpType: 'powerful' });
    systems.step(world, 16);

    const v2 = world.velocities.get(id)!;
    expect(v2.vy).toBeCloseTo(509.76, 1); // Should get full jump velocity minus gravity (520 - 10.24)
  });

  test('prevents triple jump - only one double jump per cycle', () => {
    const world = new World();
    const systems = new SystemRunner();
    systems.add(JumpImpulseSystem);
    systems.add(MovementSystem);

    const id = world.entities.create();
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.renderables.set(id, { kind: 'cat' });
    world.cats.set(id, { state: 'idle' });
    world.velocities.set(id, { vx: 0, vy: 0, vz: 0 });

    // First jump from ground
    world.catIntents.set(id, { happyJump: true, jumpType: 'powerful' });
    systems.step(world, 16);

    // Simulate time to get in air
    for (let i = 0; i < 10; i++) {
      nowMs += 16;
      systems.step(world, 16);
    }

    // Second jump (double jump)
    world.catIntents.set(id, { happyJump: true, jumpType: 'powerful' });
    systems.step(world, 16);
    const v2 = world.velocities.get(id)!;
    expect(v2.vy).toBeCloseTo(509.76, 1);

    // Simulate more time to still be in air
    for (let i = 0; i < 5; i++) {
      nowMs += 16;
      systems.step(world, 16);
    }

    // Third jump attempt should fail
    const vBefore = world.velocities.get(id)!;
    world.catIntents.set(id, { happyJump: true, jumpType: 'powerful' });
    systems.step(world, 16);
    const vAfter = world.velocities.get(id)!;
    
    // Velocity should be unchanged except for gravity (no jump occurred)
    expect(vAfter.vy).toBeCloseTo(vBefore.vy - 10.24, 1); // Only gravity applied
  });

  test('resets double jump availability when landing', () => {
    const world = new World();
    const systems = new SystemRunner();
    systems.add(JumpImpulseSystem);
    systems.add(MovementSystem);

    const id = world.entities.create();
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.renderables.set(id, { kind: 'cat' });
    world.cats.set(id, { state: 'idle' });
    world.velocities.set(id, { vx: 0, vy: 0, vz: 0 });

    // First jump cycle - use up double jump
    world.catIntents.set(id, { happyJump: true, jumpType: 'powerful' });
    systems.step(world, 16);

    // Get in air and use double jump
    for (let i = 0; i < 10; i++) {
      nowMs += 16;
      systems.step(world, 16);
    }

    world.catIntents.set(id, { happyJump: true, jumpType: 'powerful' });
    systems.step(world, 16);

    // Let cat land (simulate full jump cycle)
    for (let i = 0; i < 200; i++) {
      nowMs += 16;
      systems.step(world, 16);
    }

    // Cat should be on ground (allow some tolerance for physics simulation)
    const tLanded = world.transforms.get(id)!;
    expect(tLanded.y).toBeCloseTo(0, 5);

    // Second jump cycle - should be able to double jump again
    world.catIntents.set(id, { happyJump: true, jumpType: 'powerful' });
    systems.step(world, 16);

    // Get in air
    for (let i = 0; i < 10; i++) {
      nowMs += 16;
      systems.step(world, 16);
    }

    // Double jump should work again
    world.catIntents.set(id, { happyJump: true, jumpType: 'powerful' });
    systems.step(world, 16);
    const vDoubleJump = world.velocities.get(id)!;
    expect(vDoubleJump.vy).toBeCloseTo(509.76, 1);
  });

  test('ground jumps use velocity blending, double jumps use full velocity', () => {
    const world = new World();
    const systems = new SystemRunner();
    systems.add(JumpImpulseSystem);
    systems.add(MovementSystem);

    const id = world.entities.create();
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.renderables.set(id, { kind: 'cat' });
    world.cats.set(id, { state: 'idle' });
    world.velocities.set(id, { vx: 0, vy: 50, vz: 0 }); // Start with some upward velocity

    // Ground jump should blend with existing velocity
    world.catIntents.set(id, { happyJump: true, jumpType: 'powerful' });
    systems.step(world, 16);
    const vGroundJump = world.velocities.get(id)!;
    
    // Should be blended: 50 * 0.6 + 520 * 0.4 = 30 + 208 = 238, minus gravity = 227.76
    expect(vGroundJump.vy).toBeCloseTo(227.76, 1);
    expect(vGroundJump.vy).toBeLessThan(520); // Should be less than full jump

    // Get in air with some velocity
    for (let i = 0; i < 10; i++) {
      nowMs += 16;
      systems.step(world, 16);
    }

    // Double jump should use full velocity regardless of current velocity
    world.catIntents.set(id, { happyJump: true, jumpType: 'powerful' });
    systems.step(world, 16);
    const vDoubleJump = world.velocities.get(id)!;
    expect(vDoubleJump.vy).toBeCloseTo(509.76, 1); // Should be exactly the target velocity (minus gravity)
  });

  test('tracks jump state correctly', () => {
    const world = new World();
    const systems = new SystemRunner();
    systems.add(JumpImpulseSystem);
    systems.add(MovementSystem);

    const id = world.entities.create();
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.renderables.set(id, { kind: 'cat' });
    world.cats.set(id, { state: 'idle' });
    world.velocities.set(id, { vx: 0, vy: 0, vz: 0 });

    // Initially should have no jump state
    expect(world.jumpStates.get(id)).toBeUndefined();

    // After first jump, should have jump state
    world.catIntents.set(id, { happyJump: true, jumpType: 'powerful' });
    systems.step(world, 16);
    
    let jumpState = world.jumpStates.get(id);
    expect(jumpState).toBeDefined();
    expect(jumpState?.hasDoubleJumped).toBe(false);
    // After jumping, cat becomes airborne immediately due to MovementSystem
    expect(jumpState?.isGrounded).toBe(false);

    // Get in air
    for (let i = 0; i < 10; i++) {
      nowMs += 16;
      systems.step(world, 16);
    }

    jumpState = world.jumpStates.get(id);
    expect(jumpState?.isGrounded).toBe(false);

    // Use double jump
    world.catIntents.set(id, { happyJump: true, jumpType: 'powerful' });
    systems.step(world, 16);

    jumpState = world.jumpStates.get(id);
    expect(jumpState?.hasDoubleJumped).toBe(true);
    expect(jumpState?.isGrounded).toBe(false);
  });

  test('happy jumps use lighter velocity than powerful jumps', () => {
    const world = new World();
    const systems = new SystemRunner();
    systems.add(JumpImpulseSystem);
    systems.add(MovementSystem);

    const id = world.entities.create();
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.renderables.set(id, { kind: 'cat' });
    world.cats.set(id, { state: 'idle' });
    world.velocities.set(id, { vx: 0, vy: 0, vz: 0 });

    // Happy jump should use 260 velocity
    world.catIntents.set(id, { happyJump: true, jumpType: 'happy' });
    systems.step(world, 16);
    const vHappy = world.velocities.get(id)!;
    expect(vHappy.vy).toBeCloseTo(249.76, 1); // 260 - 10.24 gravity

    // Reset for comparison
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.velocities.set(id, { vx: 0, vy: 0, vz: 0 });
    world.jumpStates.set(id, { hasDoubleJumped: false, isGrounded: true });

    // Powerful jump should use 520 velocity
    world.catIntents.set(id, { happyJump: true, jumpType: 'powerful' });
    systems.step(world, 16);
    const vPowerful = world.velocities.get(id)!;
    expect(vPowerful.vy).toBeCloseTo(509.76, 1); // 520 - 10.24 gravity

    // Happy jump should be exactly half the velocity of powerful jump
    // Happy: 260 - 10.24 = 249.76, Powerful: 520 - 10.24 = 509.76
    expect(vHappy.vy).toBeLessThan(vPowerful.vy); // Happy should be less than powerful
    expect(vPowerful.vy - vHappy.vy).toBeCloseTo(260, 1); // Difference should be 260
  });
});
