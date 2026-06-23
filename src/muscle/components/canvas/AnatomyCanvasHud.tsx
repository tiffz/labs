import { useMemo } from 'react';
import { getNodeById } from '../../curriculum';
import { countVisibleNodesForView, layerPeelDepthLabel } from '../../layerDepthView';
import { useMuscleStore } from '../../store/useMuscleStore';

export default function AnatomyCanvasHud() {
  const hoveredNodeId = useMuscleStore((s) => s.hoveredNodeId);
  const focusedNodeId = useMuscleStore((s) => s.focusedNodeId);
  const bodyView = useMuscleStore((s) => s.bodyView);
  const layerPeelDepth = useMuscleStore((s) => s.layerPeelDepth);
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);

  const hoveredNode = hoveredNodeId ? getNodeById(hoveredNodeId) : undefined;
  const focusedNode = focusedNodeId ? getNodeById(focusedNodeId) : undefined;
  const labelNode = hoveredNode ?? focusedNode;

  const visibleNodeCount = useMemo(
    () => countVisibleNodesForView(bodyView, activeModuleId, layerPeelDepth),
    [activeModuleId, bodyView, layerPeelDepth],
  );

  return (
    <div className="muscle-canvas-hud" aria-live="polite">
      {labelNode ? (
        <div className="muscle-canvas-hud__hover" data-testid="muscle-hover-label">
          <span className="muscle-canvas-hud__hover-name">{labelNode.name}</span>
          <span className="muscle-canvas-hud__hover-meta">
            {LAYER_DEPTH_META(labelNode.layerDepth)} ·{' '}
            {labelNode.type.charAt(0).toUpperCase() + labelNode.type.slice(1)}
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

function LAYER_DEPTH_META(depth: 0 | 1 | 2 | 3): string {
  if (depth === 0) return 'Superficial';
  if (depth === 1) return 'Intermediate';
  if (depth === 2) return 'Deep';
  return 'Skeleton';
}
