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
    onCatPositionUpdate: (p: { x: number; y: number; z?: number }) => void;
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

// For now Actor simply looks up the transform and renders the existing CatInteractionManager.
// This keeps behavior stable while we migrate to full ECS usage.
const Actor: React.FC<ActorProps> = ({ entityId, economy, mouseState, ui }) => {
  const world = useWorld();
  const t = world.transforms.get(entityId);
  if (!t) return null;

  // Prefer ShadowSystem projection if present
  const shadow = world.shadows.get(entityId);
  const ground = catCoordinateSystem.catToScreen({ x: t.x, y: 0, z: t.z });
  const shadowCoords = { x: t.x, y: shadow?.centerY ?? ground.y, scale: ground.scale * 0.8 };

  return (
    <CatInteractionManager
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


