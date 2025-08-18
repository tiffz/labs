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
const SMILE_MS = 750;
const EAR_WIGGLE_MS = 500;
const TAIL_FLICK_MS = 600;
const STARTLED_MS = 450;

// Keep per-entity timers in a WeakMap keyed by World to avoid globals in tests
const perWorldState = new WeakMap<World, Map<string, { t0: number; phase: 'prep' | 'pounce' | 'recover' }>>();
const perWorldAnimTimers = new WeakMap<World, Map<string, { smileUntil?: number; earUntil?: number; tailUntil?: number; startledUntil?: number }>>();
const perWorldAlertTimers = new WeakMap<World, Map<string, { alertUntil?: number }>>();
// Track one-frame animation flags that should be cleared on the NEXT tick (not the same tick they were set)
const perWorldOneFrameToClear = new WeakMap<World, Set<string>>();
const ALERT_DECAY_MS = 250;

export const CatStateSystem: System = (world) => {
  let timers = perWorldState.get(world);
  if (!timers) {
    timers = new Map();
    perWorldState.set(world, timers);
  }
  let animTimers = perWorldAnimTimers.get(world);
  if (!animTimers) {
    animTimers = new Map();
    perWorldAnimTimers.set(world, animTimers);
  }
  let alertTimers = perWorldAlertTimers.get(world);
  if (!alertTimers) {
    alertTimers = new Map();
    perWorldAlertTimers.set(world, alertTimers);
  }
  // One-frame latch clearing sets
  const pendingClear = perWorldOneFrameToClear.get(world) || new Set<string>();
  const clearNextTick = new Set<string>();

  for (const [id, cat] of world.cats.entries()) {
    const intent = world.catIntents.get(id) || {};
    let nextState = cat.state;
    const shouldClearOneFrame = pendingClear.has(id);

    // Sleep control overrides everything
    if (intent.sleeping && cat.state !== 'sleeping') {
      nextState = 'sleeping';
      timers.delete(id);
    } else if (!intent.sleeping && cat.state === 'sleeping') {
      nextState = 'idle';
    }

    // Short-lived animation intents (edge-triggered)
    const now = performance.now();
    if (intent.noseBoop || intent.cheekPet) {
      world.catAnims.set(id, { ...(world.catAnims.get(id) || {}), smiling: true });
      const tm = animTimers.get(id) || {};
      tm.smileUntil = now + SMILE_MS;
      animTimers.set(id, tm);
    }
    if (intent.earLeft || intent.earRight) {
      world.catAnims.set(id, { ...(world.catAnims.get(id) || {}), earWiggle: intent.earLeft ? 'left' : 'right' });
      const tm = animTimers.get(id) || {};
      tm.earUntil = now + EAR_WIGGLE_MS;
      animTimers.set(id, tm);
    }
    if (intent.tailFlick) {
      world.catAnims.set(id, { ...(world.catAnims.get(id) || {}), tailFlicking: true });
      const tm = animTimers.get(id) || {};
      tm.tailUntil = now + TAIL_FLICK_MS;
      animTimers.set(id, tm);
    }
    if (intent.startled) {
      const currentAnim = { ...(world.catAnims.get(id) || {}) };
      currentAnim.startled = true;
      world.catAnims.set(id, currentAnim);
      const tm = animTimers.get(id) || {};
      // Always extend/refresh startled window on new intent
      tm.startledUntil = now + STARTLED_MS;
      animTimers.set(id, tm);
    }

    // If no new startled intent but anim is still requested and timer exists, keep it until expiry
    if (intent.subtleWiggle) {
      world.catAnims.set(id, { ...(world.catAnims.get(id) || {}), subtleWiggle: true });
      // Clear this one-frame flag on the next tick
      clearNextTick.add(id);
    }

    // Active flow when not sleeping
    if (nextState !== 'sleeping') {
      if (intent.alert && (cat.state === 'idle' || cat.state === 'recover')) {
        nextState = 'alert';
        const tm = alertTimers.get(id) || {};
        tm.alertUntil = performance.now() + ALERT_DECAY_MS;
        alertTimers.set(id, tm);
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
          // Pounce jump impulse is now handled by JumpImpulseSystem via Actor component
          console.debug('[POUNCE] start', { id, vz: (world.velocities.get(id)?.vz || 0) });
          try {
            const dbg = (world as unknown as { __debug?: Record<string, unknown> }).__debug || {};
            const key = String(id);
            (dbg as { pouncePhase?: Record<string, string> }).pouncePhase = {
              ...(dbg as { pouncePhase?: Record<string, string> }).pouncePhase,
              [key]: 'pounce-start',
            };
            (world as unknown as { __debug?: Record<string, unknown> }).__debug = dbg;
          } catch {
            // no-op
          }
        }
      }
      if (cat.state === 'pouncing' && entry?.phase === 'pounce') {
        if (performance.now() - entry.t0 >= POUNCE_MS) {
          nextState = 'recover';
          timers.set(id, { t0: performance.now(), phase: 'recover' });
          // No forced Z damping here; run system handles drift when not pouncing
          console.debug('[POUNCE] recover', { id, vz: (world.velocities.get(id) || { vz: 0 }).vz });
        }
      }
      if (cat.state === 'recover' && entry?.phase === 'recover') {
        if (performance.now() - entry.t0 >= RECOVER_MS) {
          nextState = 'idle';
          timers.delete(id);
          // No forced Z reset; avoid snapping
          console.debug('[POUNCE] end', { id });
        }
      }

      // Alert decays back to idle if no further input
      if (cat.state === 'alert') {
        const tm = alertTimers.get(id);
        if (tm && tm.alertUntil && performance.now() >= tm.alertUntil && !intent.pouncePrep) {
          nextState = 'idle';
          alertTimers.set(id, { alertUntil: undefined });
        }
      }
    }

    if (nextState !== cat.state) {
      world.cats.set(id, { state: nextState });
    }

    // Clear edge-triggered intents after processing to avoid latching
    if (intent.noseBoop || intent.earLeft || intent.earRight || intent.tailFlick || intent.cheekPet || intent.startled || intent.subtleWiggle || intent.alert) {
      world.catIntents.set(id, {
        ...intent,
        noseBoop: false,
        earLeft: false,
        earRight: false,
        tailFlick: false,
        cheekPet: false,
        startled: false,
        subtleWiggle: false,
        alert: false,
      });
    }

    // Expire animation outputs by timers
    const tm = animTimers.get(id);
    const now2 = performance.now();
    const current = { ...(world.catAnims.get(id) || {}) };
    // Safety: if startled is set but we have no timer recorded, clear it to avoid indefinite latch
    if (current.startled && (!tm || !tm.startledUntil)) {
      current.startled = false;
    }
    if (tm) {
      if (tm.smileUntil && now2 >= tm.smileUntil) {
        current.smiling = false;
        tm.smileUntil = undefined;
      }
      if (tm.earUntil && now2 >= tm.earUntil) {
        current.earWiggle = null;
        tm.earUntil = undefined;
      }
      if (tm.tailUntil && now2 >= tm.tailUntil) {
        current.tailFlicking = false;
        tm.tailUntil = undefined;
      }
      if (tm.startledUntil && now2 >= tm.startledUntil) {
        current.startled = false;
        tm.startledUntil = undefined;
      }
      animTimers.set(id, tm);
    }
    // Clear one-frame latches on the tick AFTER they were set
    if (shouldClearOneFrame) {
      if (current.subtleWiggle) current.subtleWiggle = false;
    }
    world.catAnims.set(id, current);
    // Disable verbose logging now that behavior is verified
  }
  // Commit one-frame clears for next tick
  perWorldOneFrameToClear.set(world, clearNextTick);
};


