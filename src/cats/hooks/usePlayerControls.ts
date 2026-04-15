import { useEffect } from 'react';
import type { World } from '../engine';

/**
 * Handles keyboard input for run mode: arrow keys for movement, space for jump.
 * Uses a standalone RAF loop to continuously feed held-key state into ECS run controls,
 * ensuring the cat entity receives movement input every frame while keys are pressed.
 */
export function usePlayerControls(
  world: World,
  playerControlMode: boolean,
  resetInactivityTimer: () => void,
) {
  useEffect(() => {
    if (!playerControlMode) return;
    const held = { left: false, right: false, up: false, down: false };
    const onDown = (e: KeyboardEvent) => {
      const prev = { ...held };
      if (e.key === 'ArrowLeft') held.left = true;
      if (e.key === 'ArrowRight') held.right = true;
      if (e.key === 'ArrowUp') held.up = true;
      if (e.key === 'ArrowDown') held.down = true;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        const existing = Array.from(world.renderables.entries()).find(([, r]) => r.kind === 'cat');
        const catId = existing?.[0];
        if (catId) {
          const intent = world.catIntents.get(catId) || {};
          intent.happyJump = true;
          intent.jumpType = 'powerful';
          world.catIntents.set(catId, intent);
        }
      }
      if (prev.left !== held.left || prev.right !== held.right || prev.up !== held.up || prev.down !== held.down) {
        resetInactivityTimer();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') held.left = false;
      if (e.key === 'ArrowRight') held.right = false;
      if (e.key === 'ArrowUp') held.up = false;
      if (e.key === 'ArrowDown') held.down = false;
    };

    let raf: number | null = null;
    const step = () => {
      const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      const dz = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      const existing = Array.from(world.renderables.entries()).find(([, r]) => r.kind === 'cat');
      const catId = existing?.[0];
      if (catId) {
        world.runControls.set(catId, { moveX: dx, moveZ: dz });
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [playerControlMode, resetInactivityTimer, world]);
}
