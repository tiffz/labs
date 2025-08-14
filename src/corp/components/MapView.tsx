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
};

export function MapView({ state, tilesX, tilesY, startCol, startRow, tileSize }: Props) {
  const { tiles, entities, fog } = useMemo(() => {
    const tiles: Array<{ key: string; className: string; left: number; top: number; z: number }> = [];
    const fog: Array<{ key: string; className: string; left: number; top: number }> = [];
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const mapX = startCol + x;
        const mapY = startRow + y;
        if (mapX < 0 || mapX >= MAP_WIDTH || mapY < 0 || mapY >= MAP_HEIGHT) continue;
        const tile: Tile = state.map[mapY][mapX];
        const isWall = tile.isWall;
        const isFrontWall = isWall && (mapY + 1 >= MAP_HEIGHT || !state.map[mapY + 1][mapX].isWall);
        if (tile.visible || tile.revealed) {
          const klass = `tile ${isWall ? 'wall' : 'floor'}${isFrontWall ? ' front-face' : ''}`;
          tiles.push({ key: `t-${mapX}-${mapY}`, className: klass, left: x * tileSize, top: y * tileSize - (isWall ? tileSize * 0.5 : 0), z: y });
        }
        const tileState = tile.visible ? 'visible' : tile.revealed ? 'revealed' : 'hidden';
        if (tileState !== 'visible') fog.push({ key: `f-${mapX}-${mapY}`, className: `fog-tile ${tileState}`, left: x * tileSize, top: y * tileSize });
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
      <div className="map-container" id="map-container" data-origin={`${startCol},${startRow}`} style={{ width: tilesX * tileSize, height: tilesY * tileSize }}>
        {tiles.map(t => (
          <div key={t.key} className={t.className} style={{ left: t.left, top: t.top, zIndex: t.z }} />
        ))}
        {entities.map(e => (
          <div key={e.id} id={e.id} data-pos={`${e.mapX},${e.mapY}`} className="entity" style={{ left: e.left, top: e.top, zIndex: e.z }}>{e.emoji}</div>
        ))}
      </div>
      <div className="fog-container" id="fog-container" style={{ width: tilesX * tileSize, height: tilesY * tileSize }}>
        {fog.map(f => (
          <div key={f.key} className={f.className} style={{ left: f.left, top: f.top }} />
        ))}
      </div>
    </>
  );
}


