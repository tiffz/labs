import React from 'react';
import { useWorld } from '../../context/useWorld';
import type { EntityId } from '../../engine';
import CatInteractionManager from './CatInteractionManager';
import { catCoordinateSystem } from '../../services/CatCoordinateSystem';
import type { EconomyCalculations } from '../../services/GameEconomyService';
import type { MouseState } from '../../hooks/useMouseTracking';

interface ActorProps {
  entityId: EntityId;
  economy: EconomyCalculations;
  mouseState: MouseState;
  // Pass through existing props we already compute at App level
  ui: {
    catEnergy: number;
    wandMode: boolean;
    isPouncing: boolean;
    isPlaying: boolean;
    isShaking: boolean;
    isEarWiggling: boolean;
    isHappyPlaying: boolean;
    pounceTarget: { x: number; y: number } | null;
    pounceConfidence: number;
    catActions: {
      addEnergy: (delta: number) => void;
      toggleWandMode: () => void;
      handleWandMovement: (position: { x: number; y: number }) => void;
      handleWandClick: () => void;
    };
    trackableHeartId: number | null;
    hearts: Array<{ id: number; x: number; y: number; translateX: number; rotation: number; scale: number; animationDuration: number }>;
    isSleeping: boolean;
    isDrowsy: boolean;
    onLoveGained: (amt: number) => void;
    onCatPositionUpdate?: (p: { x: number; y: number; z?: number }) => void;
    trackSpecialAction: (a: 'noseClicks' | 'earClicks' | 'cheekPets' | 'happyJumps') => void;
    heartSpawningService: {
      spawnHearts: (config: {
        position: { x: number; y: number };
        loveAmount: number;
        interactionType: 'petting' | 'pouncing';
      }) => void;
    };
    eventLoggers?: {
      logPetting: () => void;
      logPouncing: () => void;
      logHappy: () => void;
      logNoseClick: () => void;
      logEarClick: () => void;
      logCheekPet: () => void;
    };
  };
}

const REACT_UPDATE_INTERVAL = 6; // re-render every 6th tick (~10fps) for walking detection etc.

const Actor: React.FC<ActorProps> = ({ entityId, economy, mouseState, ui }) => {
  const world = useWorld();
  const transformRef = React.useRef<{ x: number; y: number; z: number } | null>(null);
  const tickCountRef = React.useRef(0);
  const [, force] = React.useState(0);

  // Throttle React re-renders to ~10fps. CatView's direct DOM mutation handles
  // smooth 60fps position updates; React only needs to update for walking
  // detection and other low-frequency state in CatInteractionManager.
  // Z-layer changes always trigger an immediate re-render for stacking correctness.
  React.useEffect(() => {
    const onTick = () => {
      const t = world.transforms.get(entityId);
      if (!t) return;
      tickCountRef.current++;
      const prev = transformRef.current;
      const zLayerChanged = prev && Math.floor(prev.z) !== Math.floor(t.z);
      const shouldUpdate = !prev || zLayerChanged || tickCountRef.current % REACT_UPDATE_INTERVAL === 0;
      if (shouldUpdate && (!prev || prev.x !== t.x || prev.y !== t.y || prev.z !== t.z)) {
        transformRef.current = { x: t.x, y: t.y, z: t.z };
        force((v) => (v + 1) & 0x3fffffff);
      }
    };
    window.addEventListener('world-tick', onTick);
    return () => window.removeEventListener('world-tick', onTick);
  }, [world, entityId]);

  // Bridge UI pounce start to a small upward impulse in ECS for visible hop
  const prevPouncingRef = React.useRef<boolean>(ui.isPouncing);
  React.useEffect(() => {
    const was = prevPouncingRef.current;
    if (!was && ui.isPouncing) {
      // Rising edge: request a jump impulse in ECS
      const intent = world.catIntents.get(entityId) || {};
      intent.happyJump = true;
      intent.jumpType = 'powerful'; // Pounce uses powerful jumps
      world.catIntents.set(entityId, intent);

      // Horizontal assist: aim toward current wand/mouse world X at the moment of pounce
      const t = world.transforms.get(entityId);
      if (t) {
        // Prefer ECS-provided pounce target (relative to cat). Positive = right, negative = left.
        let dir = Math.sign(ui.pounceTarget?.x ?? 0);
        // Fallback to current mouse world position if target is neutral
        if (dir === 0) {
          const screenX = (window as unknown as { __mouseX__?: number }).__mouseX__ ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
          const screenY = (window as unknown as { __mouseY__?: number }).__mouseY__ ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 0);
          const targetWorld = catCoordinateSystem.screenPositionToWorldCoordinates(screenX, screenY, t.z);
          dir = Math.sign(targetWorld.x - t.x);
        }
        if (dir !== 0) {
          const start = performance.now();
          const DURATION_MS = 520; // even longer assist to travel far across the screen
          const FEED = () => {
            const now = performance.now();
            if (now - start > DURATION_MS) return;
            world.runControls.set(entityId, { moveX: dir, moveZ: 0, boost: true });
            requestAnimationFrame(FEED);
          };
          requestAnimationFrame(FEED);
        }
      }
    }
    prevPouncingRef.current = ui.isPouncing;
  }, [ui.isPouncing, ui.pounceTarget?.x, world, entityId]);
  const t = world.transforms.get(entityId);
  if (!t) return null;

  // Prefer ShadowSystem projection if present
  const shadow = world.shadows.get(entityId);
  const ground = catCoordinateSystem.catToScreen({ x: t.x, y: 0, z: t.z });
  const shadowCoords = { x: t.x, y: shadow?.centerY ?? ground.y, scale: ground.scale * 0.8 };

  return (
    <CatInteractionManager
      entityId={entityId}
      economy={economy}
      catEnergy={ui.catEnergy}
      wandMode={ui.wandMode}
      isPouncing={ui.isPouncing}
      isPlaying={ui.isPlaying}
      isShaking={ui.isShaking}
      isEarWiggling={ui.isEarWiggling}
      isHappyPlaying={ui.isHappyPlaying}
      pounceTarget={ui.pounceTarget}
      pounceConfidence={ui.pounceConfidence}
      catActions={ui.catActions}
      trackableHeartId={ui.trackableHeartId}
      hearts={ui.hearts}
      isSleeping={ui.isSleeping}
      isDrowsy={ui.isDrowsy}
      onLoveGained={ui.onLoveGained}
      onCatPositionUpdate={ui.onCatPositionUpdate}
      trackSpecialAction={ui.trackSpecialAction}
      heartSpawningService={ui.heartSpawningService}
      mouseState={mouseState}
      catWorldCoords={t}
      shadowCoords={shadowCoords}
      shadowCenterOverride={shadow?.centerY}
      eventLoggers={ui.eventLoggers}
    />
  );
};

export default Actor;


