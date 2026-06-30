import { useShallow } from 'zustand/react/shallow';
import { collectStudyGroupIdsForNode } from '../../curriculum/resolveStudyGroupForNode';
import type { MuscleMemoryNode } from '../../types/node';
import { useMuscleStore } from '../../store/useMuscleStore';
import { isNodeVisibleAtPeelDepth } from '../../layerDepthView';
import { buildMeshFlags, resolveMeshVisualState, type MeshRenderFlags } from './meshState';

export type AnatomyMeshFlags = MeshRenderFlags;

const HIDDEN_FLAGS: AnatomyMeshFlags = {
  visible: false,
  visualState: 'default',
};

export function useAnatomyMeshFlags(
  nodeId: string,
  node: MuscleMemoryNode | undefined,
): AnatomyMeshFlags {
  return useMuscleStore(
    useShallow((state) => {
      if (!node || !isNodeVisibleAtPeelDepth(node, state.layerPeelDepth)) {
        return HIDDEN_FLAGS;
      }

      const highlightTarget =
        state.quiz.quizMode === 'locate_name' && state.quiz.feedback === 'idle'
          ? null
          : state.quiz.targetNodeId;

      const hoveredGroupNodeIds =
        state.mode === 'warmup' && state.hoveredNodeId
          ? collectStudyGroupIdsForNode(state.hoveredNodeId, {
              moduleId: state.bodyView === 'region' ? state.activeModuleId : undefined,
            })
          : null;

      const visualState = resolveMeshVisualState({
        nodeId,
        focusedNodeId: state.focusedNodeId,
        focusedGroupNodeIds: state.focusedGroupNodeIds,
        hoveredGroupNodeIds,
        hoveredNodeId: state.hoveredNodeId,
        quizTargetId: highlightTarget,
        quizFeedback: state.quiz.feedback,
        mode: state.mode,
      });

      return buildMeshFlags(node, visualState);
    }),
  );
}
