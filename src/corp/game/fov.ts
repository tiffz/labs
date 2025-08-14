import { MAP_HEIGHT, MAP_WIDTH, FOV_RADIUS } from './constants';
import type { GameState } from './types';

/**
 * Mutates state's map tiles to update visible/revealed flags from player's position.
 */
export function computeFov(state: GameState, radius: number = FOV_RADIUS): void {
  for (let y = 0; y < MAP_HEIGHT; y++) for (let x = 0; x < MAP_WIDTH; x++) state.map[y][x].visible = false;
  const oct = [
    { xx: 1, xy: 0, yx: 0, yy: 1 }, { xx: 0, xy: 1, yx: 1, yy: 0 },
    { xx: 0, xy: -1, yx: 1, yy: 0 }, { xx: -1, xy: 0, yx: 0, yy: 1 },
    { xx: -1, xy: 0, yx: 0, yy: -1 }, { xx: 0, xy: -1, yx: -1, yy: 0 },
    { xx: 0, xy: 1, yx: -1, yy: 0 }, { xx: 1, xy: 0, yx: 0, yy: -1 }
  ];
  function cast(cx: number, cy: number, row: number, start: number, end: number, t: { xx: number; xy: number; yx: number; yy: number }) {
    if (start < end) return;
    let newStart = 0.0;
    for (let j = row; j <= radius; j++) {
      let blocked = false;
      for (let dx = -j; dx <= 0; dx++) {
        const dy = -j; const l = (dx - 0.5) / (dy + 0.5); const r = (dx + 0.5) / (dy - 0.5);
        if (start < r) continue; if (end > l) break;
        const sax = dx * t.xx + dy * t.xy; const say = dx * t.yx + dy * t.yy;
        const mx = cx + sax; const my = cy + say; if (mx < 0 || mx >= MAP_WIDTH || my < 0 || my >= MAP_HEIGHT) continue;
        state.map[my][mx].visible = true; state.map[my][mx].revealed = true;
        if (blocked) { if (state.map[my][mx].isWall) { newStart = r; continue; } blocked = false; start = newStart; }
        else if (state.map[my][mx].isWall) { blocked = true; cast(cx, cy, j + 1, start, l, t); newStart = r; }
      }
      if (blocked) break;
    }
  }
  const px = state.player.pos.x; const py = state.player.pos.y;
  state.map[py][px].visible = true; state.map[py][px].revealed = true;
  for (let i = 0; i < 8; i++) cast(px, py, 1, 1.0, 0.0, oct[i]);
  const room = state.rooms.find(r => px >= r.x && px < r.x + r.width && py >= r.y && py < r.y + r.height);
  if (room) {
    for (let y = room.y; y < room.y + room.height; y++) for (let x = room.x; x < room.x + room.width; x++) {
      state.map[y][x].visible = true; state.map[y][x].revealed = true;
    }
  }
}


