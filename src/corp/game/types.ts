export type Point = { x: number; y: number };

export type Tile = {
  walkable: boolean;
  visible: boolean;
  revealed: boolean;
  isWall: boolean;
};

export type Entity = {
  id: string;
  pos: Point;
  emoji: string;
};

export type Coworker = Entity & {
  name: string;
  effects: { productivity: number; happiness: number; reputation: number };
  behavior: 'chase' | 'flee';
};

export type CoworkerType = {
  name: string;
  emoji: string;
  effects: { productivity: number; happiness: number; reputation: number };
  behavior: 'chase' | 'flee';
};

export type ItemType = {
  name: string;
  emoji: string;
  effects: { productivity: number; happiness: number; reputation: number };
};

export type GameState = {
  map: Tile[][];
  rooms: Array<{ x: number; y: number; width: number; height: number }>;
  player: {
    id: 'player';
    pos: Point;
    emoji: string;
    name: string;
    productivity: number;
    maxProductivity: number;
    happiness: number;
    reputation: number;
    inventory: Record<string, number>;
    skills: { proficiency: number; teamwork: number };
  };
  messages: string[];
  gameOver: boolean;
  floor: number;
  coworkerTypes: CoworkerType[];
  itemTypes: ItemType[];
  coworkers: Coworker[];
  items: Array<Entity & ItemType>;
  computers: Entity[];
  dogs: Array<Entity & { name: string }>;
  elevator: Entity;
};


