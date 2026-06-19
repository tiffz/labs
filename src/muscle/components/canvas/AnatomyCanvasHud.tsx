import { useMemo } from 'react';
import { getNodeById } from '../../curriculum';
import { countVisibleRegionNodesAtPeel, layerPeelDepthLabel } from '../../layerDepthView';
import { useMuscleStore } from '../../store/useMuscleStore';

export default function AnatomyCanvasHud() {
  const hoveredNodeId = useMuscleStore((s) => s.hoveredNodeId);
  const layerPeelDepth = useMuscleStore((s) => s.layerPeelDepth);
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);

  const hoveredNode = hoveredNodeId ? getNodeById(hoveredNodeId) : undefined;

  const visibleNodeCount = useMemo(
    () => countVisibleRegionNodesAtPeel(activeModuleId, layerPeelDepth),
    [activeModuleId, layerPeelDepth],
  );

  return (
    <div className="muscle-canvas-hud" aria-live="polite">
      {hoveredNode ? (
        <div className="muscle-canvas-hud__hover" data-testid="muscle-hover-label">
          <span className="muscle-canvas-hud__hover-name">{hoveredNode.name}</span>
          <span className="muscle-canvas-hud__hover-meta">
            {LAYER_DEPTH_META(hoveredNode.layerDepth)} ·{' '}
            {hoveredNode.type.charAt(0).toUpperCase() + hoveredNode.type.slice(1)}
          </span>
        </div>
      ) : (
        <p className="muscle-canvas-hud__hint">Hover or tap a structure to study it.</p>
      )}
      <p className="muscle-canvas-hud__layer" data-testid="muscle-layer-status">
        {layerPeelDepthLabel(layerPeelDepth)} · {visibleNodeCount} visible
      </p>
    </div>
  );
}

function LAYER_DEPTH_META(depth: 0 | 1 | 2): string {
  if (depth === 0) return 'Surface';
  if (depth === 1) return 'Intermediate';
  return 'Deep';
}
