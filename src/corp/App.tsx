import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TILE_SIZE, MAP_HEIGHT, MAP_WIDTH, CEO_FLOOR } from './game/constants';
import { MapView } from './components/MapView';
import { UIPanel } from './components/UIPanel';
import type { GameState } from './game/types';
import { createEmptyMap, generateRooms, carveRooms, connectRooms, seedEntities } from './game/generation';

function useResizeObserver(target: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const cr = entry.contentRect;
      setSize({ width: Math.round(cr.width), height: Math.round(cr.height) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);
  return size;
}

function useGame() {
  const [version, setVersion] = useState(0);
  const stateRef = useRef<GameState | null>(null);
  const forceRender = () => setVersion((v) => v + 1);

  const clamp = useCallback((num: number, min: number, max: number) => Math.min(Math.max(num, min), max), []);

  const calculateFov = useCallback(() => {
    const state = stateRef.current!;
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
      for (let j = row; j <= 8; j++) {
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
  }, []);

  const addMessage = useCallback((msg: string) => {
    const state = stateRef.current!;
    state.messages.push(msg);
    state.messages = state.messages.slice(-20);
  }, []);

  const handleNpcTurns = useCallback(() => {
    const state = stateRef.current!;
    state.coworkers.forEach(coworker => {
      // Tick down coworker productivity each turn
      coworker.productivity = clamp(coworker.productivity - 1, 0, coworker.maxProductivity);

      // Decide goal: boost happiness by chatting with player, or boost productivity by seeking computer
      let target: { x: number; y: number } | null = null;
      let intent: 'chat' | 'work' | 'idle' = 'idle';

      if (coworker.happiness < coworker.ai.happinessLowThreshold) {
        intent = 'chat';
        target = state.player.pos;
      } else if (coworker.productivity < coworker.ai.productivityLowThreshold) {
        intent = 'work';
        // naive: find nearest computer by Manhattan distance
        let best = Infinity;
        state.computers.forEach(pc => {
          const d = Math.abs(pc.pos.x - coworker.pos.x) + Math.abs(pc.pos.y - coworker.pos.y);
          if (d < best) { best = d; target = pc.pos; }
        });
      }

      if (target) {
        const dx = Math.sign(target.x - coworker.pos.x);
        const dy = Math.sign(target.y - coworker.pos.y);
        const nextPos = { x: coworker.pos.x + dx, y: coworker.pos.y + dy };
        const isPlayerPos = nextPos.x === state.player.pos.x && nextPos.y === state.player.pos.y;
        const isOccupied = state.coworkers.some(c => c !== coworker && c.pos.x === nextPos.x && c.pos.y === nextPos.y);
        if (isPlayerPos && intent === 'chat') {
          addMessage(`${coworker.name} chats with you.`);
          coworker.happiness = clamp(coworker.happiness + coworker.ai.happinessPerChat, 0, 100);
          // Player receives effects when being chatted to
          const teamworkBonus = 1 + (state.player.skills.teamwork * 0.05);
          state.player.productivity = clamp(state.player.productivity + (coworker.effects.productivity / teamworkBonus), 0, state.player.maxProductivity);
          state.player.happiness = clamp(state.player.happiness + (coworker.effects.happiness * teamworkBonus), 0, 100);
          state.player.reputation = clamp(state.player.reputation + (coworker.effects.reputation * teamworkBonus), 0, 100);
          // If satisfied, stop chasing
          if (coworker.happiness >= coworker.ai.happinessSatisfiedThreshold) intent = 'idle';
        } else if (state.map[nextPos.y]?.[nextPos.x]?.walkable && !isOccupied && !isPlayerPos) {
          coworker.pos = nextPos;
        }
      } else {
        // Idle slight wander near current position
        const dx = Math.floor(Math.random() * 3) - 1;
        const dy = Math.floor(Math.random() * 3) - 1;
        const nextPos = { x: coworker.pos.x + dx, y: coworker.pos.y + dy };
        const isPlayerPos = nextPos.x === state.player.pos.x && nextPos.y === state.player.pos.y;
        const isOccupied = state.coworkers.some(c => c !== coworker && c.pos.x === nextPos.x && c.pos.y === nextPos.y);
        if (state.map[nextPos.y]?.[nextPos.x]?.walkable && !isOccupied && !isPlayerPos) coworker.pos = nextPos;
      }

      // If standing on a computer and needs productivity, work
      if (state.computers.some(pc => pc.pos.x === coworker.pos.x && pc.pos.y === coworker.pos.y)) {
        coworker.productivity = clamp(coworker.productivity + coworker.ai.productivityPerWork, 0, coworker.maxProductivity);
      }
    });
  }, [addMessage, clamp]);

  const generateLevel = useCallback(() => {
    const state = stateRef.current!;
    const map = createEmptyMap();
    const rooms = generateRooms();
    carveRooms(map, rooms);
    if (rooms.length > 1) connectRooms(map, rooms);
    const playerStartRoom = rooms[0];
    state.player.pos = { x: Math.floor(playerStartRoom.x + playerStartRoom.width / 2), y: Math.floor(playerStartRoom.y + playerStartRoom.height / 2) };
    const deskPos = { x: playerStartRoom.x + 1, y: playerStartRoom.y + 1 };
    const seeded = seedEntities(state, map, rooms);
    seeded.computers.push({ id: 'computer-desk', pos: deskPos, emoji: '🖥️' });
    map[deskPos.y][deskPos.x].walkable = false;
    const elevatorRoom = rooms[rooms.length - 1] || rooms[0];
    const elevator = { id: 'elevator', pos: { x: Math.floor(elevatorRoom.x + elevatorRoom.width / 2), y: Math.floor(elevatorRoom.y + elevatorRoom.height / 2) }, emoji: '🔼' };
    state.map = map; state.rooms = rooms; state.coworkers = seeded.coworkers; state.items = seeded.items; state.computers = seeded.computers; state.dogs = seeded.dogs; state.elevator = elevator;
  }, []);

  const takePlayerTurn = useCallback((action: 'move' | 'use_item', data: { dx?: number; dy?: number; name?: string }) => {
    const state = stateRef.current!;
    if (!state || !state.player || state.gameOver) return;
    let turnTaken = false;
    if (action === 'move') {
      const { dx = 0, dy = 0 } = data;
      const targetPos = { x: state.player.pos.x + dx, y: state.player.pos.y + dy };
      if (targetPos.y < 0 || targetPos.y >= MAP_HEIGHT || targetPos.x < 0 || targetPos.x >= MAP_WIDTH) return;
      if (state.elevator && targetPos.x === state.elevator.pos.x && targetPos.y === state.elevator.pos.y) {
        state.floor++;
        if (state.floor > CEO_FLOOR) {
          state.gameOver = true;
        } else {
          addMessage(`You take the elevator to floor ${state.floor}.`);
          generateLevel();
        }
        turnTaken = true;
      } else {
        const coworkerIndex = (state.coworkers || []).findIndex(c => c.pos.x === targetPos.x && c.pos.y === targetPos.y);
        const computerIndex = (state.computers || []).findIndex(c => c.pos.x === targetPos.x && c.pos.y === targetPos.y);
        const dogIndex = (state.dogs || []).findIndex(d => d.pos.x === targetPos.x && d.pos.y === targetPos.y);
        if (coworkerIndex !== -1) {
          const coworker = state.coworkers[coworkerIndex];
          if (coworker.behavior === 'flee') { addMessage(`You cornered ${coworker.name}! They give you some tips.`); state.player.productivity = clamp(state.player.productivity + coworker.effects.productivity, 0, state.player.maxProductivity); state.coworkers.splice(coworkerIndex, 1); }
          else { addMessage(`You chat with ${coworker.name}.`); const teamworkBonus = 1 + (state.player.skills.teamwork * 0.05); state.player.productivity = clamp(state.player.productivity + (coworker.effects.productivity / teamworkBonus), 0, state.player.maxProductivity); state.player.happiness = clamp(state.player.happiness + (coworker.effects.happiness * teamworkBonus), 0, 100); state.player.reputation = clamp(state.player.reputation + (coworker.effects.reputation * teamworkBonus), 0, 100); state.player.skills.teamwork++; }
          turnTaken = true;
        } else if (computerIndex !== -1) {
          const productivityGain = 15 + state.player.skills.proficiency; addMessage(`You answer some emails. (+${productivityGain} Prod)`);
          state.player.productivity = clamp(state.player.productivity + productivityGain, 0, state.player.maxProductivity);
          state.player.happiness = clamp(state.player.happiness - 5, 0, 100);
          state.player.skills.proficiency++;
          turnTaken = true;
        } else if (dogIndex !== -1) {
          const dog = state.dogs[dogIndex]; addMessage(`You pet ${dog.name}. Your spirits are lifted!`);
          state.player.happiness = clamp(state.player.happiness + 20, 0, 100);
          turnTaken = true;
        } else if (state.map[targetPos.y]?.[targetPos.x]?.walkable) {
          state.player.pos = targetPos;
          const itemIndex = (state.items || []).findIndex(i => i.pos.x === targetPos.x && i.pos.y === targetPos.y);
          if (itemIndex !== -1) {
            const item = state.items[itemIndex];
            state.player.inventory[item.name] = (state.player.inventory[item.name] || 0) + 1;
            addMessage(`You picked up ${item.name}.`);
            state.items.splice(itemIndex, 1);
          }
          turnTaken = true;
        }
      }
    } else if (action === 'use_item') {
      const itemName = data.name;
      if (!itemName) return;
      const item = state.itemTypes.find(it => it.name === itemName);
      if (item && state.player.inventory[itemName] > 0) {
        addMessage(`You use ${item.name}.`);
        state.player.productivity = clamp(state.player.productivity + item.effects.productivity, 0, state.player.maxProductivity);
        state.player.happiness = clamp(state.player.happiness + item.effects.happiness, 0, 100);
        state.player.reputation = clamp(state.player.reputation + item.effects.reputation, 0, 100);
        state.player.inventory[itemName]--;
        if (state.player.inventory[itemName] <= 0) delete state.player.inventory[itemName];
        turnTaken = true;
      }
    }
    if (turnTaken) {
      state.player.productivity = clamp(state.player.productivity - 1, 0, state.player.maxProductivity);
      if (state.player.productivity < 40 && Math.random() < 0.1) addMessage("Your manager sends a 'gentle reminder' about deadlines.");
      handleNpcTurns();
      calculateFov();
      // Check game over conditions
      if (
        state.player.productivity <= 0 ||
        state.player.happiness <= 0 ||
        state.player.reputation <= 0
      ) {
        state.gameOver = true;
      }
      forceRender();
    }
  }, [addMessage, calculateFov, clamp, generateLevel, handleNpcTurns]);

  const restart = useCallback(() => {
    stateRef.current = {
      player: { id: 'player', pos: { x: 0, y: 0 }, emoji: '🧑‍💼', name: 'You', productivity: 200, maxProductivity: 200, happiness: 100, reputation: 100, inventory: {}, skills: { proficiency: 0, teamwork: 0 } },
      messages: [], gameOver: false, floor: 1,
      coworkerTypes: [
        { emoji: '🗣️', name: 'Chatty Charlotte', effects: { productivity: -15, happiness: 10, reputation: 0 }, behavior: 'chase', base: { productivity: 120, maxProductivity: 120, happiness: 40, reputation: 60 }, ai: { happinessLowThreshold: 50, happinessSatisfiedThreshold: 75, happinessPerChat: 25, productivityLowThreshold: 40, productivityPerWork: 15 } },
        { emoji: '🤫', name: 'The Gossiper', effects: { productivity: -5, happiness: 0, reputation: -15 }, behavior: 'chase', base: { productivity: 130, maxProductivity: 130, happiness: 50, reputation: 50 }, ai: { happinessLowThreshold: 45, happinessSatisfiedThreshold: 70, happinessPerChat: 20, productivityLowThreshold: 35, productivityPerWork: 15 } },
        { emoji: '😴', name: 'Slacker Sam', effects: { productivity: -10, happiness: 5, reputation: -5 }, behavior: 'chase', base: { productivity: 100, maxProductivity: 100, happiness: 60, reputation: 40 }, ai: { happinessLowThreshold: 55, happinessSatisfiedThreshold: 80, happinessPerChat: 20, productivityLowThreshold: 30, productivityPerWork: 10 } },
        { emoji: '🏃', name: 'Productivity Guru', effects: { productivity: 30, happiness: 0, reputation: 0 }, behavior: 'flee', base: { productivity: 160, maxProductivity: 160, happiness: 70, reputation: 70 }, ai: { happinessLowThreshold: 30, happinessSatisfiedThreshold: 60, happinessPerChat: 15, productivityLowThreshold: 60, productivityPerWork: 25 } },
      ],
      itemTypes: [
        { name: 'a fresh coffee', emoji: '☕', effects: { productivity: 20, happiness: 0, reputation: 0 } },
        { name: 'a box of donuts', emoji: '🍩', effects: { productivity: -5, happiness: 20, reputation: 0 } },
        { name: 'a Synergy Report', emoji: '📝', effects: { productivity: -5, happiness: -5, reputation: -5 } },
        { name: 'a laptop', emoji: '💻', effects: { productivity: 15, happiness: -5, reputation: 0 } },
      ],
      map: createEmptyMap(), rooms: [], coworkers: [], items: [], computers: [], dogs: [], elevator: { id: 'elevator', pos: { x: 0, y: 0 }, emoji: '🔼' }
    } as GameState;
    addMessage('You arrive for another day at the office. Your goal: get that promotion.');
    generateLevel();
    calculateFov();
    forceRender();
  }, [addMessage, calculateFov, generateLevel]);

  useEffect(() => { restart(); }, [restart]);

  return {
    stateRef,
    version,
    restart,
    takePlayerTurn,
    useResizeObserver,
  };
}

export default function CorpApp() {
  const { stateRef, version, takePlayerTurn, restart, useResizeObserver } = useGame();
  const viewportRef = useRef<HTMLDivElement>(null);
  const { width, height } = useResizeObserver(viewportRef);
  const [winSize, setWinSize] = useState<{ w: number; h: number }>({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setWinSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const state = stateRef.current;

  const widthEff = width || viewportRef.current?.clientWidth || winSize.w;
  const heightEff = height || viewportRef.current?.clientHeight || winSize.h;
  const tilesX = Math.max(1, Math.ceil(widthEff / TILE_SIZE));
  const tilesY = Math.max(1, Math.ceil(heightEff / TILE_SIZE));
  const startCol = tilesX > 0 ? (state?.player.pos.x ?? 0) - Math.floor(tilesX / 2) : 0;
  const startRow = tilesY > 0 ? (state?.player.pos.y ?? 0) - Math.floor(tilesY / 2) : 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      let dx = 0, dy = 0;
      if (e.key === 'ArrowUp') dy = -1; else if (e.key === 'ArrowDown') dy = 1; else if (e.key === 'ArrowLeft') dx = -1; else if (e.key === 'ArrowRight') dx = 1;
      if (dx !== 0 || dy !== 0) { e.preventDefault(); takePlayerTurn('move', { dx, dy }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [takePlayerTurn]);

  const handleUseItem = useCallback((name: string) => {
    takePlayerTurn('use_item', { name });
  }, [takePlayerTurn]);

  // Center the map inside the viewport by offsetting the container when there is extra space
  const mapWidthPx = tilesX * TILE_SIZE;
  const mapHeightPx = tilesY * TILE_SIZE;
  const offsetLeft = widthEff > mapWidthPx ? Math.floor((widthEff - mapWidthPx) / 2) : 0;
  const offsetTop = heightEff > mapHeightPx ? Math.floor((heightEff - mapHeightPx) / 2) : 0;

  return (
    <div className="game-container" id="game-container" key={version}>
      <div className="viewport" id="viewport" ref={viewportRef}>
        {state ? (
          <MapView
            state={state}
            tilesX={tilesX}
            tilesY={tilesY}
            startCol={startCol}
            startRow={startRow}
            tileSize={TILE_SIZE}
            offsetLeft={offsetLeft}
            offsetTop={offsetTop}
          />
        ) : (
          <>
            <div
              className="map-container"
              id="map-container"
              style={{ width: mapWidthPx, height: mapHeightPx, left: offsetLeft, top: offsetTop }}
            />
            <div
              className="fog-container"
              id="fog-container"
              style={{ width: mapWidthPx, height: mapHeightPx, left: offsetLeft, top: offsetTop }}
            />
          </>
        )}
      </div>
      <UIPanel state={state ?? null} onUseItem={handleUseItem} onRestart={restart} />
    </div>
  );
}


