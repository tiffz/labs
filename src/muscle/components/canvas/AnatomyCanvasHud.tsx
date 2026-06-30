import { getNodeById } from '../../curriculum';
import { findMultiMemberStudyGroupForNode } from '../../curriculum/resolveStudyGroupForNode';
import { useMuscleStore } from '../../store/useMuscleStore';

export default function AnatomyCanvasHud() {
  const hoveredNodeId = useMuscleStore((s) => s.hoveredNodeId);
  const focusedNodeId = useMuscleStore((s) => s.focusedNodeId);
  const focusedGroupNodeIds = useMuscleStore((s) => s.focusedGroupNodeIds);
  const bodyView = useMuscleStore((s) => s.bodyView);
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const mode = useMuscleStore((s) => s.mode);
  const referenceHalfHint = useMuscleStore((s) => s.referenceHalfHint);
  const setReferenceHalfHint = useMuscleStore((s) => s.setReferenceHalfHint);

  const hoveredNode = hoveredNodeId ? getNodeById(hoveredNodeId) : undefined;
  const focusedNode = focusedNodeId ? getNodeById(focusedNodeId) : undefined;
  const focusGroup =
    focusedNodeId && focusedGroupNodeIds?.length
      ? findMultiMemberStudyGroupForNode(focusedNodeId, {
          moduleId: bodyView === 'region' ? activeModuleId : undefined,
        })
      : undefined;
  const hoverGroup =
    mode === 'warmup' && hoveredNodeId
      ? findMultiMemberStudyGroupForNode(hoveredNodeId, {
          moduleId: bodyView === 'region' ? activeModuleId : undefined,
        })
      : undefined;
  const labelNode = hoveredNode ?? focusedNode;
  const hasFocus = Boolean(focusedNodeId) || Boolean(focusedGroupNodeIds?.length);

  return (
    <div className="muscle-canvas-hud" aria-live="polite">
      {referenceHalfHint !== 'idle' ? (
        <div className="muscle-canvas-hud__reference-chip" data-testid="muscle-reference-half-hint">
          <span>Reference half · study on the right</span>
          {referenceHalfHint === 'pinned' ? (
            <button type="button" onClick={() => setReferenceHalfHint('idle')} aria-label="Dismiss">
              ×
            </button>
          ) : null}
        </div>
      ) : null}
      {hoverGroup ? (
        <div className="muscle-canvas-hud__hover" data-testid="muscle-hover-label">
          <span className="muscle-canvas-hud__hover-name">{hoverGroup.label}</span>
          <span className="muscle-canvas-hud__hover-meta muscle-canvas-hud__hover-meta--group">
            Muscle group · click to study
          </span>
        </div>
      ) : focusGroup && focusedNode ? (
        <div className="muscle-canvas-hud__hover" data-testid="muscle-hover-label">
          <span className="muscle-canvas-hud__hover-name">{focusedNode.name}</span>
          <span className="muscle-canvas-hud__hover-meta muscle-canvas-hud__hover-meta--selected">
            {focusGroup.label} · selected · siblings in amber
          </span>
        </div>
      ) : labelNode ? (
        <div className="muscle-canvas-hud__hover" data-testid="muscle-hover-label">
          <span className="muscle-canvas-hud__hover-name">{labelNode.name}</span>
          <span className="muscle-canvas-hud__hover-meta">
            {LAYER_DEPTH_META(labelNode.layerDepth)} ·{' '}
            {labelNode.type.charAt(0).toUpperCase() + labelNode.type.slice(1)}
          </span>
        </div>
      ) : focusedGroupNodeIds && focusedGroupNodeIds.length > 0 ? (
        <p className="muscle-canvas-hud__hint">Group in amber · tap a member to select in blue</p>
      ) : (
        <p className="muscle-canvas-hud__hint">Hover or tap a structure to study it.</p>
      )}
      <p className="muscle-canvas-hud__nav-hint">
        Drag to orbit · Right-drag or two-finger drag to pan · Scroll to zoom
        {hasFocus ? ' · Esc to show all' : ''}
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
