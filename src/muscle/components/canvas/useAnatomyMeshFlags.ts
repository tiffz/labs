import { useShallow } from 'zustand/react/shallow';
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

      const visualState = resolveMeshVisualState({
        nodeId,
        focusedNodeId: state.focusedNodeId,
        hoveredNodeId: state.hoveredNodeId,
        quizTargetId: state.quiz.targetNodeId,
        quizFeedback: state.quiz.feedback,
        mode: state.mode,
      });

      return buildMeshFlags(node, visualState);
    }),
  );
}
