import React from 'react';
import { useWorld } from '../../context/useWorld';
import type { EconomyCalculations } from '../../services/GameEconomyService';
import type { MouseState } from '../../hooks/useMouseTracking';
import Actor from './Actor';
// import FurnitureView from './FurnitureView';
import ScratchingPost from './furniture/ScratchingPost';
import Couch from './furniture/Couch';

interface WorldRendererProps {
  economy: EconomyCalculations;
  mouseState: MouseState;
  ui: Parameters<typeof Actor>[0]['ui'];
}

const WorldRenderer: React.FC<WorldRendererProps> = ({ economy, mouseState, ui }) => {
  const world = useWorld();

  // Sort by world z descending (farther first), so nearer entities render later and appear on top.
  const entities = Array.from(world.renderables.entries()).sort((a, b) => {
    const ta = world.transforms.get(a[0]);
    const tb = world.transforms.get(b[0]);
    const za = ta?.z ?? 0;
    const zb = tb?.z ?? 0;
    return zb - za;
  });

  const actors: React.ReactNode[] = [];
  for (const [entityId, renderable] of entities) {
    if (renderable.kind === 'cat') {
      actors.push(
        <Actor key={entityId} entityId={entityId} economy={economy} mouseState={mouseState} ui={ui} />
      );
    } else if (renderable.kind === 'furniture') {
      const t = world.transforms.get(entityId);
      if (t) {
        // Choose demo component: scratching post; fallback to rectangle
        actors.push(<ScratchingPost key={entityId} x={t.x} z={t.z} />);
      }
    } else if (renderable.kind === 'couch') {
      const t = world.transforms.get(entityId);
      if (t) {
        actors.push(<Couch key={entityId} x={t.x} z={t.z} />);
      }
    }
    // Future: handle furniture, hearts, etc.
  }

  return <>{actors}</>; // Fragment to keep layout identical
};

export default WorldRenderer;


