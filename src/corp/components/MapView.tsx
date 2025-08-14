import React, { useMemo } from 'react';
import { MAP_HEIGHT, MAP_WIDTH } from '../game/constants';
import type { GameState, Tile } from '../game/types';

type Props = {
  state: GameState;
  tilesX: number;
  tilesY: number;
  startCol: number;
  startRow: number;
  tileSize: number;
  offsetLeft?: number;
  offsetTop?: number;
};

export function MapView({ state, tilesX, tilesY, startCol, startRow, tileSize, offsetLeft = 0, offsetTop = 0 }: Props) {
  const { tiles, entities, fog } = useMemo(() => {
    const tiles: Array<{ key: string; className: string; left: number; top: number; z: number }> = [];
    const fog: Array<{ key: string; className: string; left: number; top: number }> = [];
    function hasVisibleNeighbor(mx: number, my: number): boolean {
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const nx = mx + ox;
          const ny = my + oy;
          if (nx < 0 || ny < 0 || nx >= MAP_WIDTH || ny >= MAP_HEIGHT) continue;
          if (state.map[ny][nx].visible) return true;
        }
      }
      return false;
    }
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const mapX = startCol + x;
        const mapY = startRow + y;
        if (mapX < 0 || mapX >= MAP_WIDTH || mapY < 0 || mapY >= MAP_HEIGHT) continue;
        const tile: Tile = state.map[mapY][mapX];
        const soft = !tile.visible && hasVisibleNeighbor(mapX, mapY);
        const isWall = tile.isWall;
        const isFrontWall = isWall && (mapY + 1 >= MAP_HEIGHT || !state.map[mapY + 1][mapX].isWall);
        if (tile.visible || tile.revealed || soft) {
          const klass = `tile ${isWall ? 'wall' : 'floor'}${isFrontWall ? ' front-face' : ''}`;
          tiles.push({ key: `t-${mapX}-${mapY}`, className: klass, left: x * tileSize, top: y * tileSize - (isWall ? tileSize * 0.5 : 0), z: y });
        }
        const tileState = tile.visible ? 'visible' : soft ? 'soft' : tile.revealed ? 'revealed' : 'hidden';
        if (tileState !== 'visible') fog.push({ key: `f-${mapX}-${mapY}`, className: `fog-tile ${tileState}`, left: (x + 1) * tileSize, top: (y + 1) * tileSize });
      }
    }

    // Extend fog beyond world bounds by 1 tile in all directions to cover wall overhangs
    const margin = 1;
    for (let y = -margin; y < tilesY + margin; y++) {
      for (let x = -margin; x < tilesX + margin; x++) {
        const mapX = startCol + x;
        const mapY = startRow + y;
        if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT) continue; // only out-of-bounds
        fog.push({ key: `oob-${mapX}-${mapY}`, className: 'fog-tile hidden', left: (x + 1) * tileSize, top: (y + 1) * tileSize });
      }
    }
    const list = [...state.items, ...state.coworkers, ...state.computers, ...state.dogs, state.player, state.elevator].filter(Boolean);
    const entities = list.map((entity) => ({
      id: entity.id,
      mapX: entity.pos.x,
      mapY: entity.pos.y,
      left: (entity.pos.x - startCol) * tileSize,
      top: (entity.pos.y - startRow) * tileSize - tileSize * 0.5,
      z: entity.pos.y - startRow,
      emoji: entity.emoji,
    }));
    return { tiles, entities, fog };
  }, [state, tilesX, tilesY, startCol, startRow, tileSize]);

  return (
    <>
      <div
        className="map-container"
        id="map-container"
        data-origin={`${startCol},${startRow}`}
        style={{ width: tilesX * tileSize, height: tilesY * tileSize, left: offsetLeft, top: offsetTop }}
      >
        {tiles.map(t => (
          <div key={t.key} className={t.className} style={{ left: t.left, top: t.top, zIndex: t.z }} />
        ))}
        {entities.map(e => (
          <div key={e.id} id={e.id} data-pos={`${e.mapX},${e.mapY}`} className="entity" style={{ left: e.left, top: e.top, zIndex: e.z }}>{e.emoji}</div>
        ))}
      </div>
      <div
        className="fog-container"
        id="fog-container"
        style={{ width: (tilesX + 2) * tileSize, height: (tilesY + 2) * tileSize, left: offsetLeft - tileSize, top: offsetTop - tileSize }}
      >
        {fog.map(f => (
          <div key={f.key} className={f.className} style={{ left: f.left, top: f.top }} />
        ))}
      </div>
    </>
  );
}


