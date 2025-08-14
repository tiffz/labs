import { describe, expect, it } from 'vitest';
import { createEmptyMap, generateRooms, carveRooms, connectRooms, seedEntities } from './generation';
import { MAP_HEIGHT, MAP_WIDTH } from './constants';

// Minimal fake GameState for seeding
const makeState = () => ({
  map: createEmptyMap(),
  rooms: [],
  player: { id: 'player', pos: { x: 0, y: 0 }, emoji: '🧑‍💼', name: 'You', productivity: 200, maxProductivity: 200, happiness: 100, reputation: 100, inventory: {}, skills: { proficiency: 0, teamwork: 0 } },
  messages: [],
  gameOver: false,
  floor: 1,
  coworkerTypes: [
    { emoji: '🗣️', name: 'Chatty Charlotte', effects: { productivity: -15, happiness: 10, reputation: 0 }, behavior: 'chase' },
  ],
  itemTypes: [
    { name: 'a fresh coffee', emoji: '☕', effects: { productivity: 20, happiness: 0, reputation: 0 } },
  ],
  coworkers: [], items: [], computers: [], dogs: [],
  elevator: { id: 'elevator', pos: { x: 0, y: 0 }, emoji: '🔼' },
});

describe('generation', () => {
  it('creates at least one room and carves it', () => {
    const map = createEmptyMap();
    const rooms = generateRooms();
    expect(rooms.length).toBeGreaterThan(0);
    carveRooms(map, rooms);
    // Find at least one walkable tile inside first room
    const r0 = rooms[0];
    const mid = { x: r0.x + Math.floor(r0.width / 2), y: r0.y + Math.floor(r0.height / 2) };
    expect(map[mid.y][mid.x].walkable).toBe(true);
    expect(map[mid.y][mid.x].isWall).toBe(false);
  });

  it('connects rooms with corridors that are walkable', () => {
    const map = createEmptyMap();
    const rooms = generateRooms();
    carveRooms(map, rooms);
    if (rooms.length > 1) {
      connectRooms(map, rooms);
      // Validate connectivity with a simple BFS between centers
      const start = { x: rooms[0].x + Math.floor(rooms[0].width / 2), y: rooms[0].y + Math.floor(rooms[0].height / 2) };
      const goal = { x: rooms[1].x + Math.floor(rooms[1].width / 2), y: rooms[1].y + Math.floor(rooms[1].height / 2) };
      const q: Array<{x:number;y:number}> = [start];
      const seen = new Set<string>([`${start.x},${start.y}`]);
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]] as const;
      let found = false;
      while (q.length && !found) {
        const cur = q.shift()!;
        if (cur.x === goal.x && cur.y === goal.y) { found = true; break; }
        for (const [dx,dy] of dirs) {
          const nx = cur.x + dx, ny = cur.y + dy;
          if (nx < 0 || ny < 0 || nx >= MAP_WIDTH || ny >= MAP_HEIGHT) continue;
          if (!map[ny][nx].walkable) continue;
          const key = `${nx},${ny}`;
          if (seen.has(key)) continue;
          seen.add(key);
          q.push({ x: nx, y: ny });
        }
      }
      expect(found).toBe(true);
    }
  });

  it('seeds entities within map bounds', () => {
    const state = makeState();
    const rooms = generateRooms();
    carveRooms(state.map, rooms);
    const { coworkers, items, computers, dogs } = seedEntities(state, state.map, rooms);
    const all = [...coworkers, ...items, ...computers, ...dogs];
    all.forEach(e => {
      expect(e.pos.x).toBeGreaterThanOrEqual(0);
      expect(e.pos.x).toBeLessThan(MAP_WIDTH);
      expect(e.pos.y).toBeGreaterThanOrEqual(0);
      expect(e.pos.y).toBeLessThan(MAP_HEIGHT);
    });
  });
});


