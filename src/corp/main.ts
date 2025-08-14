import './styles/corp.css';
import { TILE_SIZE, MAP_HEIGHT, MAP_WIDTH, CEO_FLOOR } from './game/constants';
import type { GameState } from './game/types';
import { createEmptyMap, generateRooms, carveRooms, connectRooms, seedEntities } from './game/generation';

// Minimal bootstrap: wire DOM elements and orchestrate game loop with extracted helpers

const gameContainer = document.getElementById('game-container') as HTMLDivElement;
const viewport = document.getElementById('viewport') as HTMLDivElement;
const mapContainer = document.getElementById('map-container') as HTMLDivElement;
const fogContainer = document.getElementById('fog-container') as HTMLDivElement;

const productivityBar = document.getElementById('productivity-bar') as HTMLDivElement;
const happinessBar = document.getElementById('happiness-bar') as HTMLDivElement;
const reputationBar = document.getElementById('reputation-bar') as HTMLDivElement;
const floorNumber = document.getElementById('floor-number') as HTMLSpanElement;
const proficiencySkill = document.getElementById('proficiency-skill') as HTMLSpanElement;
const teamworkSkill = document.getElementById('teamwork-skill') as HTMLSpanElement;
const inventoryGrid = document.getElementById('inventory-grid') as HTMLDivElement;
const logContainer = document.getElementById('log-container') as HTMLDivElement;
const logMessages = document.getElementById('log-messages') as HTMLDivElement;
const gameOverOverlay = document.getElementById('game-over-overlay') as HTMLDivElement;
const gameOverTitle = document.getElementById('game-over-title') as HTMLHeadingElement;
const gameOverText = document.getElementById('game-over-text') as HTMLParagraphElement;
const restartButton = document.getElementById('restart-button') as HTMLButtonElement;

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

let state: GameState;
let renderScheduled = false;

function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    renderScheduled = false;
    renderAll();
  });
}

function renderAll() {
  renderMapAndEntities();
  renderFogOfWar();
  renderUI();
}

function renderMapAndEntities() {
  if (!state.player) return;
  mapContainer.innerHTML = '';

  const viewportWidth = viewport.clientWidth;
  const viewportHeight = viewport.clientHeight;
  const tilesX = Math.ceil(viewportWidth / TILE_SIZE);
  const tilesY = Math.ceil(viewportHeight / TILE_SIZE);
  const startCol = state.player.pos.x - Math.floor(tilesX / 2);
  const startRow = state.player.pos.y - Math.floor(tilesY / 2);

  mapContainer.style.width = `${tilesX * TILE_SIZE}px`;
  mapContainer.style.height = `${tilesY * TILE_SIZE}px`;

  const tilesFragment = document.createDocumentFragment();
  for (let y = 0; y < tilesY; y++) {
    for (let x = 0; x < tilesX; x++) {
      const mapX = startCol + x;
      const mapY = startRow + y;
      if (mapX < 0 || mapX >= MAP_WIDTH || mapY < 0 || mapY >= MAP_HEIGHT) continue;
      const tile = state.map[mapY][mapX];
      // Always render if visible or revealed to avoid invisible obstacles
      if (!tile.revealed && !tile.visible) continue;
      const tileDiv = document.createElement('div');
      const isWall = tile.isWall;
      tileDiv.className = `tile ${isWall ? 'wall' : 'floor'}`;
      tileDiv.style.left = `${x * TILE_SIZE}px`;
      const yOffset = isWall ? TILE_SIZE * 0.5 : 0;
      tileDiv.style.top = `${y * TILE_SIZE - yOffset}px`;
      tileDiv.style.zIndex = String(y);
      const isFrontWall = isWall && (mapY + 1 >= MAP_HEIGHT || !state.map[mapY + 1][mapX].isWall);
      if (isFrontWall) tileDiv.classList.add('front-face');
      tilesFragment.appendChild(tileDiv);
    }
  }
  mapContainer.appendChild(tilesFragment);

  const entitiesToRender = [...state.items, ...state.coworkers, ...state.computers, ...state.dogs, state.player, state.elevator];
  const entitiesFragment = document.createDocumentFragment();
  entitiesToRender.forEach(entity => {
    if (!entity) return;
    const entityX = entity.pos.x - startCol;
    const entityY = entity.pos.y - startRow;
    if (entityX < 0 || entityX >= tilesX || entityY < 0 || entityY >= tilesY) return;
    const entityDiv = document.createElement('div');
    entityDiv.className = 'entity';
    entityDiv.id = entity.id;
    entityDiv.textContent = entity.emoji;
    entityDiv.style.left = `${entityX * TILE_SIZE}px`;
    const yOffset = TILE_SIZE * 0.5;
    entityDiv.style.top = `${entityY * TILE_SIZE - yOffset}px`;
    entityDiv.style.zIndex = String(entityY);
    entitiesFragment.appendChild(entityDiv);
  });
  mapContainer.appendChild(entitiesFragment);
}

function renderFogOfWar() {
  if (!state.player) return;
  fogContainer.innerHTML = '';
  const viewportWidth = viewport.clientWidth;
  const viewportHeight = viewport.clientHeight;
  const tilesX = Math.ceil(viewportWidth / TILE_SIZE);
  const tilesY = Math.ceil(viewportHeight / TILE_SIZE);
  const startCol = state.player.pos.x - Math.floor(tilesX / 2);
  const startRow = state.player.pos.y - Math.floor(tilesY / 2);

  fogContainer.style.width = `${tilesX * TILE_SIZE}px`;
  fogContainer.style.height = `${tilesY * TILE_SIZE}px`;
  const fogFragment = document.createDocumentFragment();
  for (let y = 0; y < tilesY; y++) {
    for (let x = 0; x < tilesX; x++) {
      const mapX = startCol + x;
      const mapY = startRow + y;
      let tileState: 'hidden' | 'visible' | 'revealed' = 'hidden';
      if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT) {
        const tile = state.map[mapY][mapX];
        if (tile.visible) tileState = 'visible'; else if (tile.revealed) tileState = 'revealed';
      }
      if (tileState !== 'visible') {
        const fogDiv = document.createElement('div');
        fogDiv.className = `fog-tile ${tileState}`;
        fogDiv.style.left = `${x * TILE_SIZE}px`;
        fogDiv.style.top = `${y * TILE_SIZE}px`;
        fogFragment.appendChild(fogDiv);
      }
    }
  }
  fogContainer.appendChild(fogFragment);
}

function renderUI() {
  const p = state.player;
  productivityBar.style.width = `${(p.productivity / p.maxProductivity) * 100}%`;
  happinessBar.style.width = `${p.happiness}%`;
  reputationBar.style.width = `${p.reputation}%`;
  floorNumber.textContent = String(state.floor);
  proficiencySkill.textContent = String(p.skills.proficiency);
  teamworkSkill.textContent = String(p.skills.teamwork);
  inventoryGrid.innerHTML = '';
  const inventoryItems = Object.keys(p.inventory);
  if (inventoryItems.length === 0) {
    inventoryGrid.innerHTML = '<p class="empty">Empty</p>';
  } else {
    inventoryItems.forEach(itemName => {
      const item = state.itemTypes.find(it => it.name === itemName);
      const count = p.inventory[itemName];
      if (!item || count <= 0) return;
      const slotDiv = document.createElement('div');
      slotDiv.className = 'inventory-slot';
      slotDiv.dataset.itemName = itemName;
      slotDiv.innerHTML = `
        ${item.emoji}
        <span class="tooltip">${item.name.replace('a ', '')}</span>
        ${count > 1 ? `<span class="item-count">${count}</span>` : ''}
      `;
      inventoryGrid.appendChild(slotDiv);
    });
  }
  logMessages.innerHTML = state.messages.map(msg => `<p>${msg}</p>`).join('');
  logContainer.scrollTop = logContainer.scrollHeight;
}

function addMessage(msg: string) {
  state.messages.push(msg);
  state.messages = state.messages.slice(-20);
}

function calculateFov() {
  for (let y = 0; y < MAP_HEIGHT; y++) for (let x = 0; x < MAP_WIDTH; x++) state.map[y][x].visible = false;
  const oct = [
    { xx: 1, xy: 0, yx: 0, yy: 1 }, { xx: 0, xy: 1, yx: 1, yy: 0 },
    { xx: 0, xy: -1, yx: 1, yy: 0 }, { xx: -1, xy: 0, yx: 0, yy: 1 },
    { xx: -1, xy: 0, yx: 0, yy: -1 }, { xx: 0, xy: -1, yx: -1, yy: 0 },
    { xx: 0, xy: 1, yx: -1, yy: 0 }, { xx: 1, xy: 0, yx: 0, yy: -1 }
  ];
  function cast(cx: number, cy: number, row: number, start: number, end: number, t: { xx: number; xy: number; yx: number; yy: number; }) {
    if (start < end) return;
    let newStart = 0.0;
    for (let j = row; j <= 8; j++) {
      let blocked = false;
      for (let dx = -j; dx <= 0; dx++) {
        const dy = -j;
        const l = (dx - 0.5) / (dy + 0.5);
        const r = (dx + 0.5) / (dy - 0.5);
        if (start < r) continue;
        if (end > l) break;
        const sax = dx * t.xx + dy * t.xy;
        const say = dx * t.yx + dy * t.yy;
        const mx = cx + sax;
        const my = cy + say;
        if (mx < 0 || mx >= MAP_WIDTH || my < 0 || my >= MAP_HEIGHT) continue;
        state.map[my][mx].visible = true;
        state.map[my][mx].revealed = true;
        if (blocked) {
          if (state.map[my][mx].isWall) { newStart = r; continue; }
          blocked = false; start = newStart;
        } else if (state.map[my][mx].isWall) { blocked = true; cast(cx, cy, j + 1, start, l, t); newStart = r; }
      }
      if (blocked) break;
    }
  }
  const px = state.player.pos.x; const py = state.player.pos.y;
  state.map[py][px].visible = true; state.map[py][px].revealed = true;
  for (let i = 0; i < 8; i++) cast(px, py, 1, 1.0, 0.0, oct[i]);
  const room = state.rooms.find(r => px >= r.x && px < r.x + r.width && py >= r.y && py < r.y + r.height);
  if (room) {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        state.map[y][x].visible = true;
        state.map[y][x].revealed = true;
      }
    }
  }
}

function handleNpcTurns() {
  state.coworkers.forEach(coworker => {
    if (!state.map[coworker.pos.y][coworker.pos.x].visible) return;
    let dx = 0, dy = 0;
    if (coworker.behavior === 'chase') { dx = Math.sign(state.player.pos.x - coworker.pos.x); dy = Math.sign(state.player.pos.y - coworker.pos.y); }
    else { dx = -Math.sign(state.player.pos.x - coworker.pos.x); dy = -Math.sign(state.player.pos.y - coworker.pos.y); }
    if (dx === 0 && dy === 0) return;
    const nextPos = { x: coworker.pos.x + dx, y: coworker.pos.y + dy };
    const isPlayerPos = nextPos.x === state.player.pos.x && nextPos.y === state.player.pos.y;
    const isOccupied = state.coworkers.some(c => c.pos.x === nextPos.x && c.pos.y === nextPos.y);
    if (isPlayerPos && coworker.behavior === 'chase') {
      addMessage(`${coworker.name} caught you!`);
      const teamworkBonus = 1 + (state.player.skills.teamwork * 0.05);
      state.player.productivity = clamp(state.player.productivity + (coworker.effects.productivity / teamworkBonus), 0, state.player.maxProductivity);
      state.player.happiness = clamp(state.player.happiness + (coworker.effects.happiness * teamworkBonus), 0, 100);
      state.player.reputation = clamp(state.player.reputation + (coworker.effects.reputation * teamworkBonus), 0, 100);
    } else if (state.map[nextPos.y]?.[nextPos.x]?.walkable && !isOccupied && !isPlayerPos) {
      coworker.pos = nextPos;
    }
  });
  state.dogs.forEach(dog => {
    const dx = Math.floor(Math.random() * 3) - 1;
    const dy = Math.floor(Math.random() * 3) - 1;
    const nextPos = { x: dog.pos.x + dx, y: dog.pos.y + dy };
    const isPlayerPos = nextPos.x === state.player.pos.x && nextPos.y === state.player.pos.y;
    const isOccupied = state.dogs.some(d => d.id !== dog.id && d.pos.x === nextPos.x && d.pos.y === nextPos.y);
    if (state.map[nextPos.y]?.[nextPos.x]?.walkable && !isOccupied && !isPlayerPos) dog.pos = nextPos;
  });
}

function takePlayerTurn(action: 'move' | 'use_item', data: { dx?: number; dy?: number; name?: string }) {
  if (!state || !state.player || state.gameOver) return;
  let turnTaken = false;
  if (action === 'move') {
    const { dx = 0, dy = 0 } = data;
    const targetPos = { x: state.player.pos.x + dx, y: state.player.pos.y + dy };
    if (targetPos.y < 0 || targetPos.y >= MAP_HEIGHT || targetPos.x < 0 || targetPos.x >= MAP_WIDTH) return;
    if (state.elevator && targetPos.x === state.elevator.pos.x && targetPos.y === state.elevator.pos.y) {
      state.floor++;
      if (state.floor > CEO_FLOOR) { handleCeoEncounter(); }
      else { addMessage(`You take the elevator to floor ${state.floor}.`); generateLevel(); }
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
    scheduleRender();
    checkGameOver();
  }
}

function checkGameOver() {
  if (state.player.productivity <= 0) {
    state.gameOver = true;
    gameOverTitle.textContent = "You're Fired!";
    gameOverText.textContent = "Your productivity dropped to zero. Management has decided to 're-evaluate your position'.";
    gameOverOverlay.classList.add('visible');
  } else if (state.player.happiness <= 0) {
    state.gameOver = true;
    gameOverTitle.textContent = 'You Quit!';
    gameOverText.textContent = "You're completely burnt out. You storm out of the office in search of a new, less soul-crushing life.";
    gameOverOverlay.classList.add('visible');
  } else if (state.player.reputation <= 0) {
    state.gameOver = true;
    gameOverTitle.textContent = "You're Fired!";
    gameOverText.textContent = "Your reputation is in shambles. You've been 'let go' to 'pursue other opportunities'.";
    gameOverOverlay.classList.add('visible');
  }
}

function handleCeoEncounter() {
  state.gameOver = true;
  const score = (state.player.productivity / state.player.maxProductivity * 100) + state.player.happiness + state.player.reputation;
  if (score > 250) { gameOverTitle.textContent = 'Promotion!'; gameOverText.textContent = "The CEO is impressed with your synergy! You're promoted to Senior Vice President of Something-or-Other."; }
  else if (score > 150) { gameOverTitle.textContent = 'A Pat on the Back'; gameOverText.textContent = "The CEO nods. 'Good work. Keep it up.' You get a branded water bottle for your efforts."; }
  else { gameOverTitle.textContent = 'Downsized!'; gameOverText.textContent = "The CEO looks at your performance review. 'We're looking for more... alignment.' You've been synergistically downsized."; }
  gameOverOverlay.classList.add('visible');
}

function generateLevel() {
  const map = createEmptyMap();
  const rooms = generateRooms();
  carveRooms(map, rooms);
  if (rooms.length > 1) connectRooms(map, rooms);
  const playerStartRoom = rooms[0];
  state.player.pos = { x: Math.floor(playerStartRoom.x + playerStartRoom.width / 2), y: Math.floor(playerStartRoom.y + playerStartRoom.height / 2) };
  const deskPos = { x: playerStartRoom.x + 1, y: playerStartRoom.y + 1 };
  const seeded = seedEntities(state, map, rooms);
  // Ensure at least one coworker spawns for visibility during testing
  if (seeded.coworkers.length === 0 && rooms.length > 1) {
    const r = rooms[1];
    const type = state.coworkerTypes[Math.floor(Math.random() * state.coworkerTypes.length)];
    seeded.coworkers.push({ id: `coworker-seed-${Date.now()}`, pos: { x: r.x + 1, y: r.y + 1 }, emoji: type.emoji, name: type.name, effects: type.effects, behavior: type.behavior });
  }
  seeded.computers.push({ id: 'computer-desk', pos: deskPos, emoji: '🖥️' });
  map[deskPos.y][deskPos.x].walkable = false;
  const elevatorRoom = rooms[rooms.length - 1] || rooms[0];
  const elevator = { id: 'elevator', pos: { x: Math.floor(elevatorRoom.x + elevatorRoom.width / 2), y: Math.floor(elevatorRoom.y + elevatorRoom.height / 2) }, emoji: '🔼' };
  state.map = map; state.rooms = rooms; state.coworkers = seeded.coworkers; state.items = seeded.items; state.computers = seeded.computers; state.dogs = seeded.dogs; state.elevator = elevator;
}

function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number) {
  let timeout: number | undefined;
  return (...args: Parameters<T>) => {
    if (timeout) window.clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
}

function init() {
  state = {
    player: { id: 'player', pos: { x: 0, y: 0 }, emoji: '🧑‍💼', name: 'You', productivity: 200, maxProductivity: 200, happiness: 100, reputation: 100, inventory: {}, skills: { proficiency: 0, teamwork: 0 } },
    messages: [], gameOver: false, floor: 1,
    coworkerTypes: [
      { emoji: '🗣️', name: 'Chatty Charlotte', effects: { productivity: -15, happiness: 10, reputation: 0 }, behavior: 'chase' },
      { emoji: '🤫', name: 'The Gossiper', effects: { productivity: -5, happiness: 0, reputation: -15 }, behavior: 'chase' },
      { emoji: '😴', name: 'Slacker Sam', effects: { productivity: -10, happiness: 5, reputation: -5 }, behavior: 'chase' },
      { emoji: '🏃', name: 'Productivity Guru', effects: { productivity: 30, happiness: 0, reputation: 0 }, behavior: 'flee' },
    ],
    itemTypes: [
      { name: 'a fresh coffee', emoji: '☕', effects: { productivity: 20, happiness: 0, reputation: 0 } },
      { name: 'a box of donuts', emoji: '🍩', effects: { productivity: -5, happiness: 20, reputation: 0 } },
      { name: 'a Synergy Report', emoji: '📝', effects: { productivity: -5, happiness: -5, reputation: -5 } },
      { name: 'a laptop', emoji: '💻', effects: { productivity: 15, happiness: -5, reputation: 0 } },
    ],
    map: createEmptyMap(), rooms: [], coworkers: [], items: [], computers: [], dogs: [], elevator: { id: 'elevator', pos: { x: 0, y: 0 }, emoji: '🔼' }
  } as unknown as GameState;

  addMessage('You arrive for another day at the office. Your goal: get that promotion.');
  gameOverOverlay.classList.remove('visible');
  generateLevel();
  calculateFov();
  handleLayout();
}

function handleLayout() {
  const aspectRatio = window.innerWidth / window.innerHeight;
  if (aspectRatio > 1.2) {
    gameContainer.style.flexDirection = 'row';
  } else {
    gameContainer.style.flexDirection = 'column';
  }
  scheduleRender();
}

window.addEventListener('keydown', (e) => {
  let dx = 0, dy = 0;
  if (e.key === 'ArrowUp') dy = -1; else if (e.key === 'ArrowDown') dy = 1; else if (e.key === 'ArrowLeft') dx = -1; else if (e.key === 'ArrowRight') dx = 1;
  if (dx !== 0 || dy !== 0) { e.preventDefault(); takePlayerTurn('move', { dx, dy }); }
});

inventoryGrid.addEventListener('click', (e) => {
  const slot = (e.target as HTMLElement).closest('.inventory-slot') as HTMLDivElement | null;
  if (slot) takePlayerTurn('use_item', { name: slot.dataset.itemName });
});

restartButton.addEventListener('click', init);
window.addEventListener('resize', debounce(handleLayout, 150));

init();


