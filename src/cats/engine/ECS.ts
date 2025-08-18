// Minimal ECS scaffolding tailored for the cat world

export type EntityId = string;

export interface Transform3 {
  x: number;
  y: number; // logical world height
  z: number;
  scale?: number; // optional cached scale for views
}

export interface Velocity3 {
  vx: number;
  vy: number;
  vz: number;
}

export interface Renderable {
  kind: 'cat' | 'furniture' | 'heart' | 'wand' | string;
}

export interface ShadowProps {
  intensity?: number; // reserved for future visual tuning
  layout?: { left: number; bottom: number; width: number; height: number };
  centerY?: number; // visual baseline (shadow center)
}

export interface Clickable {
  hitRadius?: number; // pixels; simple circle for now
}

export interface CatBehavior {
  state: 'idle' | 'alert' | 'pouncePrep' | 'pouncing' | 'recover' | 'sleeping';
}

export interface CatIntent {
  sleeping?: boolean;
  alert?: boolean;
  pouncePrep?: boolean;
  pouncing?: boolean;
  noseBoop?: boolean;
  earLeft?: boolean;
  earRight?: boolean;
  tailFlick?: boolean;
  cheekPet?: boolean;
  startled?: boolean;
  subtleWiggle?: boolean;
  happyJump?: boolean;
  jumpType?: 'happy' | 'powerful'; // Type of jump: happy (light bounce) or powerful (run/pounce)
}

export interface CatAnim {
  smiling?: boolean;
  earWiggle?: 'left' | 'right' | null;
  tailFlicking?: boolean;
  startled?: boolean;
  subtleWiggle?: boolean;
}

export interface RunControlIntent {
  moveX?: number; // -1..1
  moveZ?: number; // -1..1
  boost?: boolean; // hint for boosted speed (e.g., pounce assist)
}

export interface JumpState {
  hasDoubleJumped?: boolean; // Whether the double jump has been used in this jump cycle
  isGrounded?: boolean; // Whether the cat is currently on the ground
}

export type Component = Transform3 | Velocity3 | Renderable | ShadowProps | Clickable | CatBehavior | CatIntent | CatAnim | RunControlIntent | JumpState;

class ComponentStore<T extends object> {
  private data = new Map<EntityId, T>();
  get(id: EntityId): T | undefined { return this.data.get(id); }
  set(id: EntityId, value: T): void { this.data.set(id, value); }
  delete(id: EntityId): void { this.data.delete(id); }
  entries(): IterableIterator<[EntityId, T]> { return this.data.entries(); }
}

class EntityStore {
  private nextId = 0;
  create(): EntityId {
    return `e${this.nextId++}`;
  }
}

export class World {
  readonly entities = new EntityStore();
  readonly transforms = new ComponentStore<Transform3>();
  readonly velocities = new ComponentStore<Velocity3>();
  readonly renderables = new ComponentStore<Renderable>();
  readonly shadows = new ComponentStore<ShadowProps>();
  readonly clickables = new ComponentStore<Clickable>();
  readonly cats = new ComponentStore<CatBehavior>();
  readonly catIntents = new ComponentStore<CatIntent>();
  readonly catAnims = new ComponentStore<CatAnim>();
  readonly runControls = new ComponentStore<RunControlIntent>();
  readonly jumpStates = new ComponentStore<JumpState>();
}

// System runner
export type System = (world: World, dtMs: number) => void;

export class SystemRunner {
  private systems: System[] = [];
  add(system: System) { this.systems.push(system); }
  step(world: World, dtMs: number) {
    for (const sys of this.systems) sys(world, dtMs);
  }
}


