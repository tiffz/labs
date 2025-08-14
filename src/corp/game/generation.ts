import { MAX_ROOM_SIZE, MAX_ROOMS, MAP_HEIGHT, MAP_WIDTH, MIN_ROOM_SIZE, MIN_ROOMS, COWORKER_SPAWN_CHANCE, ITEM_SPAWN_CHANCE, COMPUTER_SPAWN_CHANCE, DOG_SPAWN_CHANCE } from './constants';
import type { GameState, ItemType, Tile } from './types';

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export function createEmptyMap(): Tile[][] {
  return Array.from({ length: MAP_HEIGHT }, () =>
    Array.from({ length: MAP_WIDTH }, () => ({ walkable: false, visible: false, revealed: false, isWall: true }))
  );
}

export function generateRooms(): Array<{ x: number; y: number; width: number; height: number }> {
  const rooms: Array<{ x: number; y: number; width: number; height: number }> = [];
  const numRooms = rand(MIN_ROOMS, MAX_ROOMS);
  for (let i = 0; i < numRooms; i++) {
    let room; let overlaps; let attempt = 0;
    do {
      room = {
        width: rand(MIN_ROOM_SIZE, MAX_ROOM_SIZE),
        height: rand(MIN_ROOM_SIZE, MAX_ROOM_SIZE),
        x: rand(1, MAP_WIDTH - 1 - MAX_ROOM_SIZE),
        y: rand(1, MAP_HEIGHT - 1 - MAX_ROOM_SIZE),
      };
      overlaps = rooms.some(r => room.x < r.x + r.width + 1 && room.x + room.width + 1 > r.x && room.y < r.y + r.height + 1 && room.y + room.height + 1 > r.y);
      attempt++;
    } while (overlaps && attempt < 1000);
    if (!overlaps) rooms.push(room);
  }
  // Fallback: ensure at least one room exists to avoid undefined player/elevator
  if (rooms.length === 0) {
    const w = Math.max(6, Math.floor((MIN_ROOM_SIZE + MAX_ROOM_SIZE) / 2));
    const h = Math.max(6, Math.floor((MIN_ROOM_SIZE + MAX_ROOM_SIZE) / 2));
    const cx = Math.floor(MAP_WIDTH / 2);
    const cy = Math.floor(MAP_HEIGHT / 2);
    rooms.push({ x: Math.max(1, cx - Math.floor(w / 2)), y: Math.max(1, cy - Math.floor(h / 2)), width: w, height: h });
  }
  return rooms;
}

export function carveRooms(map: Tile[][], rooms: Array<{ x: number; y: number; width: number; height: number }>) {
  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        map[y][x].walkable = true;
        map[y][x].isWall = false;
      }
    }
  }
}

export function connectRooms(map: Tile[][], rooms: Array<{ x: number; y: number; width: number; height: number }>) {
  for (let i = 1; i < rooms.length; i++) {
    const prev = rooms[i - 1];
    const curr = rooms[i];
    const prevCenter = { x: Math.floor(prev.x + prev.width / 2), y: Math.floor(prev.y + prev.height / 2) };
    const currCenter = { x: Math.floor(curr.x + curr.width / 2), y: Math.floor(curr.y + curr.height / 2) };
    if (Math.random() < COWORKER_SPAWN_CHANCE) {
      for (let x = Math.min(prevCenter.x, currCenter.x); x <= Math.max(prevCenter.x, currCenter.x); x++) {
        map[prevCenter.y][x].walkable = true;
        map[prevCenter.y][x].isWall = false;
      }
      for (let y = Math.min(prevCenter.y, currCenter.y); y <= Math.max(prevCenter.y, currCenter.y); y++) {
        map[y][currCenter.x].walkable = true;
        map[y][currCenter.x].isWall = false;
      }
    } else {
      for (let y = Math.min(prevCenter.y, currCenter.y); y <= Math.max(prevCenter.y, currCenter.y); y++) {
        map[y][prevCenter.x].walkable = true;
        map[y][prevCenter.x].isWall = false;
      }
      for (let x = Math.min(prevCenter.x, currCenter.x); x <= Math.max(prevCenter.x, currCenter.x); x++) {
        map[currCenter.y][x].walkable = true;
        map[currCenter.y][x].isWall = false;
      }
    }
  }
}

export function seedEntities(state: GameState, map: Tile[][], rooms: Array<{ x: number; y: number; width: number; height: number }>) {
  const coworkers: GameState['coworkers'] = [];
  const items: GameState['items'] = [];
  const computers: GameState['computers'] = [];
  const dogs: GameState['dogs'] = [];
  const dogEmojis = ['🐕', '🐩', '🦮', '🐕‍🦺'];

  rooms.forEach((room, i) => {
    if (i === 0) return;
    if (Math.random() > 0.5) {
      const pos = { x: rand(room.x, room.x + room.width - 1), y: rand(room.y, room.y + room.height - 1) };
      const type = state.coworkerTypes[rand(0, state.coworkerTypes.length - 1)];
      coworkers.push({ id: `coworker-${i}-${Date.now()}`, pos, emoji: type.emoji, name: type.name, effects: type.effects, behavior: type.behavior });
    }
    if (Math.random() < ITEM_SPAWN_CHANCE) {
      const pos = { x: rand(room.x, room.x + room.width - 1), y: rand(room.y, room.y + room.height - 1) };
      const type: ItemType = state.itemTypes[rand(0, state.itemTypes.length - 1)];
      items.push({ id: `item-${i}`, pos, ...type });
    }
    if (Math.random() < COMPUTER_SPAWN_CHANCE) {
      const pos = { x: rand(room.x, room.x + room.width - 1), y: rand(room.y, room.y + room.height - 1) };
      computers.push({ id: `computer-${i}`, pos, emoji: '🖥️' });
      map[pos.y][pos.x].walkable = false;
    }
    if (Math.random() < DOG_SPAWN_CHANCE) {
      const pos = { x: rand(room.x, room.x + room.width - 1), y: rand(room.y, room.y + room.height - 1) };
      dogs.push({ id: `dog-${i}`, pos, name: "your coworker's dog", emoji: dogEmojis[rand(0, dogEmojis.length - 1)] });
    }
  });

  return { coworkers, items, computers, dogs };
}


