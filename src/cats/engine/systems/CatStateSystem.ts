import type { System } from '../ECS';
import { World } from '../ECS';

// Simple state machine with explicit transitions and timers
// idle -> alert (on input)
// alert -> pouncePrep (if intent.pouncePrep)
// pouncePrep -> pouncing (auto after short prep)
// pouncing -> recover (auto after short duration)
// recover -> idle (auto)
// idle <-> sleeping (via intent.sleeping)

const PREP_MS = 180;
const POUNCE_MS = 360;
const RECOVER_MS = 220;

// Keep per-entity timers in a WeakMap keyed by World to avoid globals in tests
const perWorldState = new WeakMap<World, Map<string, { t0: number; phase: 'prep' | 'pounce' | 'recover' }>>();

export const CatStateSystem: System = (world) => {
  let timers = perWorldState.get(world);
  if (!timers) {
    timers = new Map();
    perWorldState.set(world, timers);
  }

  for (const [id, cat] of world.cats.entries()) {
    const intent = world.catIntents.get(id) || {};
    let nextState = cat.state;

    // Sleep control overrides everything
    if (intent.sleeping && cat.state !== 'sleeping') {
      nextState = 'sleeping';
      timers.delete(id);
    } else if (!intent.sleeping && cat.state === 'sleeping') {
      nextState = 'idle';
    }

    // Active flow when not sleeping
    if (nextState !== 'sleeping') {
      if (intent.alert && (cat.state === 'idle' || cat.state === 'recover')) {
        nextState = 'alert';
      }
      if (intent.pouncePrep && (cat.state === 'alert' || cat.state === 'idle')) {
        nextState = 'pouncePrep';
        // arm prep timer
        timers.set(id, { t0: performance.now(), phase: 'prep' });
      }

      const entry = timers.get(id);
      if (cat.state === 'pouncePrep' && entry?.phase === 'prep') {
        if (performance.now() - entry.t0 >= PREP_MS) {
          nextState = 'pouncing';
          timers.set(id, { t0: performance.now(), phase: 'pounce' });
        }
      }
      if (cat.state === 'pouncing' && entry?.phase === 'pounce') {
        if (performance.now() - entry.t0 >= POUNCE_MS) {
          nextState = 'recover';
          timers.set(id, { t0: performance.now(), phase: 'recover' });
        }
      }
      if (cat.state === 'recover' && entry?.phase === 'recover') {
        if (performance.now() - entry.t0 >= RECOVER_MS) {
          nextState = 'idle';
          timers.delete(id);
        }
      }
    }

    if (nextState !== cat.state) {
      world.cats.set(id, { state: nextState });
    }
  }
};


