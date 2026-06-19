import { useShallow } from 'zustand/react/shallow';
import type { MuscleMemoryNode } from '../../types/node';
import { useMuscleStore } from '../../store/useMuscleStore';
import { isNodeVisibleAtPeelDepth } from '../../layerDepthView';
import { buildMeshFlags, resolveMeshVisualState, type MeshRenderFlags } from './meshState';

export type AnatomyMeshFlags = MeshRenderFlags & { roboSkelly: boolean };

const HIDDEN_FLAGS: AnatomyMeshFlags = {
  visible: false,
  visualState: 'default',
  showSubcutaneous: false,
  roboSkelly: false,
};

export function useAnatomyMeshFlags(
  nodeId: string,
  node: MuscleMemoryNode | undefined,
): AnatomyMeshFlags {
  return useMuscleStore(
    useShallow((state) => {
      if (!node || !isNodeVisibleAtPeelDepth(node, state.layerPeelDepth)) {
        return { ...HIDDEN_FLAGS, roboSkelly: state.roboSkelly };
      }

      const visualState = resolveMeshVisualState({
        nodeId,
        selectedNodeId: state.selectedNodeId,
        hoveredNodeId: state.hoveredNodeId,
        quizTargetId: state.quiz.targetNodeId,
        quizFeedback: state.quiz.feedback,
        mode: state.mode,
      });

      return {
        ...buildMeshFlags(node, visualState, state.subcutaneousGlow),
        roboSkelly: state.roboSkelly,
      };
    }),
  );
}
