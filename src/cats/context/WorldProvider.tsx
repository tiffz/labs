import React from 'react';
import { World, SystemRunner, GameLoop } from '../engine';
import { MovementSystem, ShadowSystem, CatInputBridgeSystem, CatStateSystem, JumpImpulseSystem, RunControlSystem } from '../engine';
import { WorldContext } from './WorldContextCore';

const WorldProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const worldRef = React.useRef<World | null>(null);
  const loopRef = React.useRef<GameLoop | null>(null);

  if (!worldRef.current) {
    const world = new World();
    const systems = new SystemRunner();
    // Order: run input → jump impulse → movement (gravity/integration) → shadow → input bridge → state machine
    systems.add(RunControlSystem);
    systems.add(JumpImpulseSystem);
    systems.add(MovementSystem);
    systems.add(ShadowSystem);
    systems.add(CatInputBridgeSystem);
    systems.add(CatStateSystem);
    const loop = new GameLoop(world, systems);
    worldRef.current = world;
    loopRef.current = loop;
    // Expose ECS debug data for DevPanel
    (window as unknown as { __ECS_DEBUG__?: unknown }).__ECS_DEBUG__ = {
      get world() { return world; },
    } as unknown;
  }

  React.useEffect(() => {
    loopRef.current?.start();
    return () => loopRef.current?.stop();
  }, []);

  return (
    <WorldContext.Provider value={worldRef.current!}>
      {children}
    </WorldContext.Provider>
  );
};

export default WorldProvider;


