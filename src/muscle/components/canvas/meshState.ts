import type { MuscleMemoryNode } from '../../types/node';

export type MeshVisualState =
  | 'default'
  | 'faded'
  | 'highlight'
  | 'hover'
  | 'correct'
  | 'incorrect';

export interface MeshRenderFlags {
  visible: boolean;
  visualState: MeshVisualState;
  showSubcutaneous: boolean;
}

export function resolveMeshVisualState(params: {
  nodeId: string;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  quizTargetId: string | null;
  quizFeedback: 'idle' | 'correct' | 'incorrect';
  mode: 'warmup' | 'active';
}): MeshVisualState {
  const { nodeId, selectedNodeId, hoveredNodeId, quizTargetId, quizFeedback, mode } = params;

  if (mode === 'active' && quizTargetId === nodeId) {
    if (quizFeedback === 'correct') return 'correct';
    if (quizFeedback === 'incorrect') return 'incorrect';
    return 'highlight';
  }

  if (hoveredNodeId === nodeId) return 'hover';
  if (selectedNodeId === nodeId) return 'highlight';

  if (mode === 'warmup' && selectedNodeId && selectedNodeId !== nodeId) {
    return 'faded';
  }

  if (mode === 'active' && quizTargetId && quizTargetId !== nodeId) {
    return 'faded';
  }

  return 'default';
}

export function hasSubcutaneousLandmark(node: MuscleMemoryNode): boolean {
  return Boolean(node.subcutaneousLandmarks && node.subcutaneousLandmarks.length > 0);
}

export function buildMeshFlags(
  node: MuscleMemoryNode,
  visualState: MeshVisualState,
  subcutaneousGlow: boolean,
): MeshRenderFlags {
  return {
    visible: true,
    visualState,
    showSubcutaneous: subcutaneousGlow && hasSubcutaneousLandmark(node),
  };
}
