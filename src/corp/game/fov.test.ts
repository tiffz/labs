import { describe, expect, it } from 'vitest';
import { createEmptyMap } from './generation';
import { computeFov } from './fov';
import type { GameState } from './types';

const stateFactory = (): GameState => ({
  map: createEmptyMap(),
  rooms: [{ x: 10, y: 10, width: 6, height: 6 }],
  player: { id: 'player', pos: { x: 12, y: 12 }, emoji: '🧑‍💼', name: 'You', productivity: 200, maxProductivity: 200, happiness: 100, reputation: 100, inventory: {}, skills: { proficiency: 0, teamwork: 0 } },
  messages: [],
  gameOver: false,
  floor: 1,
  coworkerTypes: [],
  itemTypes: [],
  coworkers: [],
  items: [],
  computers: [],
  dogs: [],
  elevator: { id: 'elevator', pos: { x: 0, y: 0 }, emoji: '🔼' },
});

describe('computeFov', () => {
  it('reveals and marks visible around player', () => {
    const state = stateFactory();
    computeFov(state, 4);
    expect(state.map[12][12].visible).toBe(true);
    expect(state.map[12][12].revealed).toBe(true);
  });

  it('reveals entire room the player is in', () => {
    const state = stateFactory();
    computeFov(state, 2);
    const r = state.rooms[0];
    let revealedCount = 0;
    for (let y = r.y; y < r.y + r.height; y++) for (let x = r.x; x < r.x + r.width; x++) {
      if (state.map[y][x].revealed) revealedCount++;
    }
    expect(revealedCount).toBeGreaterThan(0);
  });
});


