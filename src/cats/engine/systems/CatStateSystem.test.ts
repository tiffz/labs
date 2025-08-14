import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { World, SystemRunner } from '../index';
import { CatStateSystem } from './CatStateSystem';

describe('CatStateSystem', () => {
  let originalNow: () => number;
  let nowMs = 0;

  beforeEach(() => {
    originalNow = performance.now.bind(performance);
    nowMs = 0;
    // Stub performance.now to be controllable in tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (performance as any).now = () => nowMs;
  });

  afterEach(() => {
    // Restore original performance.now
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (performance as any).now = originalNow;
  });

  test('transitions through pounce flow: idle -> pouncePrep -> pouncing -> recover -> idle', () => {
    const world = new World();
    const systems = new SystemRunner();
    systems.add(CatStateSystem);

    const id = world.entities.create();
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.renderables.set(id, { kind: 'cat' });
    world.cats.set(id, { state: 'idle' });
    world.catIntents.set(id, {});

    // Trigger prep
    world.catIntents.set(id, { alert: true, pouncePrep: true });
    systems.step(world, 16);
    expect(world.cats.get(id)?.state).toBe('pouncePrep');

    // Advance past prep
    nowMs += 250;
    systems.step(world, 16);
    expect(world.cats.get(id)?.state).toBe('pouncing');

    // Advance past pounce
    nowMs += 500;
    systems.step(world, 16);
    expect(world.cats.get(id)?.state).toBe('recover');

    // Advance past recover
    nowMs += 500;
    systems.step(world, 16);
    expect(world.cats.get(id)?.state).toBe('idle');
  });

  test('sleep intent forces sleeping and returns to idle on clear', () => {
    const world = new World();
    const systems = new SystemRunner();
    systems.add(CatStateSystem);

    const id = world.entities.create();
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.renderables.set(id, { kind: 'cat' });
    world.cats.set(id, { state: 'idle' });
    world.catIntents.set(id, { sleeping: true });

    systems.step(world, 16);
    expect(world.cats.get(id)?.state).toBe('sleeping');

    world.catIntents.set(id, { sleeping: false });
    systems.step(world, 16);
    expect(world.cats.get(id)?.state).toBe('idle');
  });

  test('nose/ear/tail intents set corresponding animation outputs', () => {
    const world = new World();
    const systems = new SystemRunner();
    systems.add(CatStateSystem);

    const id = world.entities.create();
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.renderables.set(id, { kind: 'cat' });
    world.cats.set(id, { state: 'idle' });
    world.catIntents.set(id, { noseBoop: true, earRight: true, tailFlick: true });

    systems.step(world, 16);

    const anim = world.catAnims.get(id);
    expect(anim?.smiling).toBe(true);
    expect(anim?.earWiggle).toBe('right');
    expect(anim?.tailFlicking).toBe(true);
  });

  test('animation outputs expire after their timers', () => {
    const world = new World();
    const systems = new SystemRunner();
    systems.add(CatStateSystem);

    const id = world.entities.create();
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.renderables.set(id, { kind: 'cat' });
    world.cats.set(id, { state: 'idle' });

    // Trigger smile and ear and tail
    world.catIntents.set(id, { noseBoop: true, earLeft: true, tailFlick: true });
    systems.step(world, 16);

    // Immediately on, since same step latches outputs
    let anim = world.catAnims.get(id);
    expect(anim?.smiling).toBe(true);
    expect(anim?.earWiggle).toBe('left');
    expect(anim?.tailFlicking).toBe(true);

    // Advance 800ms — beyond all expiries
    nowMs += 800;
    systems.step(world, 16);

    anim = world.catAnims.get(id);
    expect(anim?.smiling).toBe(false);
    expect(anim?.earWiggle).toBe(null);
    expect(anim?.tailFlicking).toBe(false);
  });

  test('cheek pet triggers smiling and then expires', () => {
    const world = new World();
    const systems = new SystemRunner();
    systems.add(CatStateSystem);

    const id = world.entities.create();
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.renderables.set(id, { kind: 'cat' });
    world.cats.set(id, { state: 'idle' });

    // Trigger cheek pet
    world.catIntents.set(id, { cheekPet: true });
    systems.step(world, 16);
    let anim = world.catAnims.get(id);
    expect(anim?.smiling).toBe(true);

    // Before expiry should still be smiling
    nowMs += 700; // SMILE_MS = 750
    systems.step(world, 16);
    anim = world.catAnims.get(id);
    expect(anim?.smiling).toBe(true);

    // After expiry clears
    nowMs += 100;
    systems.step(world, 16);
    anim = world.catAnims.get(id);
    expect(anim?.smiling).toBe(false);
  });

  test('startled holds for duration and then clears', () => {
    const world = new World();
    const systems = new SystemRunner();
    systems.add(CatStateSystem);

    const id = world.entities.create();
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.renderables.set(id, { kind: 'cat' });
    world.cats.set(id, { state: 'idle' });

    // Trigger startled
    world.catIntents.set(id, { startled: true });
    systems.step(world, 16);
    let anim = world.catAnims.get(id);
    expect(anim?.startled).toBe(true);

    // Immediate next step (no time advance) should still be startled (no 1-frame flicker)
    systems.step(world, 16);
    anim = world.catAnims.get(id);
    expect(anim?.startled).toBe(true);

    // Just before expiry still true
    nowMs += 440; // STARTLED_MS = 450
    systems.step(world, 16);
    anim = world.catAnims.get(id);
    expect(anim?.startled).toBe(true);

    // After expiry should clear
    nowMs += 20;
    systems.step(world, 16);
    anim = world.catAnims.get(id);
    expect(anim?.startled).toBe(false);
  });

  test('startled retrigger extends duration', () => {
    const world = new World();
    const systems = new SystemRunner();
    systems.add(CatStateSystem);

    const id = world.entities.create();
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.renderables.set(id, { kind: 'cat' });
    world.cats.set(id, { state: 'idle' });

    // First startled
    world.catIntents.set(id, { startled: true });
    systems.step(world, 16);
    expect(world.catAnims.get(id)?.startled).toBe(true);

    // After ~300ms, retrigger
    nowMs += 300;
    world.catIntents.set(id, { startled: true });
    systems.step(world, 16);
    expect(world.catAnims.get(id)?.startled).toBe(true);

    // Advance another 300ms from retrigger (total 600ms since first) — should still be true
    nowMs += 300;
    systems.step(world, 16);
    expect(world.catAnims.get(id)?.startled).toBe(true);

    // Advance beyond extended window
    nowMs += 200;
    systems.step(world, 16);
    expect(world.catAnims.get(id)?.startled).toBe(false);
  });

  test('pounce start applies a vertical hop impulse (vy > 0)', () => {
    const world = new World();
    const systems = new SystemRunner();
    systems.add(CatStateSystem);

    const id = world.entities.create();
    world.transforms.set(id, { x: 0, y: 0, z: 0 });
    world.renderables.set(id, { kind: 'cat' });
    world.cats.set(id, { state: 'idle' });
    world.catIntents.set(id, {});

    // Enter prep
    world.catIntents.set(id, { alert: true, pouncePrep: true });
    systems.step(world, 16);
    expect(world.cats.get(id)?.state).toBe('pouncePrep');

    // Advance to pounce
    nowMs += 200; // > PREP_MS
    systems.step(world, 16);
    expect(world.cats.get(id)?.state).toBe('pouncing');

    // On transition, vy should have been nudged upward
    const v = world.velocities.get(id);
    expect(v?.vy || 0).toBeGreaterThan(0);
  });
});


