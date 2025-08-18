import React from 'react';
import { useWorld } from '../../context/useWorld';
import { useFurniture } from '../../hooks/useFurniture';
import type { EconomyCalculations } from '../../services/GameEconomyService';
import type { MouseState } from '../../hooks/useMouseTracking';
import Actor from './Actor';
// import FurnitureView from './FurnitureView';
import ScratchingPost from './furniture/ScratchingPost';
import Couch from './furniture/Couch';
import Counter from './furniture/Counter';
import Door from './furniture/Door';
import Window from './furniture/Window';
import Rug from './furniture/Rug';
import Lamp from './furniture/Lamp';
import Bookshelf from './furniture/Bookshelf';
import Painting from './furniture/Painting';

interface WorldRendererProps {
  economy: EconomyCalculations;
  mouseState: MouseState;
  ui: Parameters<typeof Actor>[0]['ui'];
}

const WorldRenderer: React.FC<WorldRendererProps> = ({ economy, mouseState, ui }) => {
  const world = useWorld();
  const furnitureEntities = useFurniture(); // Automatically reactive - triggers re-renders when furniture changes

  const actors: React.ReactNode[] = [];
  
  // Render cat entities (still using direct world access since cat updates are handled differently)
  for (const [entityId, renderable] of world.renderables.entries()) {
    if (renderable.kind === 'cat') {
      actors.push(
        <Actor key={entityId} entityId={entityId} economy={economy} mouseState={mouseState} ui={ui} />
      );
    }
  }

  // Render furniture entities reactively
  for (const { entityId, renderable, transform } of furnitureEntities) {
    if (!transform) continue;

    if (renderable.kind === 'furniture') {
      // Choose demo component: scratching post; fallback to rectangle
      actors.push(<ScratchingPost key={entityId} x={transform.x} z={transform.z} />);
    } else if (renderable.kind === 'couch') {
      actors.push(<Couch key={entityId} x={transform.x} z={transform.z} />);
    } else if (renderable.kind === 'counter') {
      actors.push(<Counter key={entityId} x={transform.x} z={transform.z} />);
    } else if (renderable.kind === 'door') {
      actors.push(<Door key={entityId} x={transform.x} z={transform.z} />);
    } else if (renderable.kind === 'window') {
      actors.push(<Window key={entityId} x={transform.x} z={transform.z} />);
    } else if (renderable.kind === 'rug') {
      actors.push(<Rug key={entityId} x={transform.x} z={transform.z} />);
    } else if (renderable.kind === 'lamp') {
      actors.push(<Lamp key={entityId} x={transform.x} z={transform.z} />);
    } else if (renderable.kind === 'bookshelf') {
      actors.push(<Bookshelf key={entityId} x={transform.x} z={transform.z} />);
    } else if (renderable.kind.startsWith('painting-')) {
      // Parse painting variant and size from kind string
      const parts = renderable.kind.split('-');
      const variant = parts[1] as 'cat' | 'abstract';
      const size = parts[2] as 'small' | 'large';
      actors.push(<Painting key={entityId} x={transform.x} y={transform.y} z={transform.z} variant={variant} size={size} />);
    }
    // Future: handle hearts, etc.
  }

  return <>{actors}</>; // Fragment to keep layout identical
};

export default WorldRenderer;


