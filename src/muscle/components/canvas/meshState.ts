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
}

export function resolveMeshVisualState(params: {
  nodeId: string;
  focusedNodeId: string | null;
  hoveredNodeId: string | null;
  quizTargetId: string | null;
  quizFeedback: 'idle' | 'correct' | 'incorrect';
  mode: 'warmup' | 'active';
}): MeshVisualState {
  const { nodeId, focusedNodeId, hoveredNodeId, quizTargetId, quizFeedback, mode } = params;

  if (mode === 'active' && quizTargetId === nodeId) {
    if (quizFeedback === 'correct') return 'correct';
    if (quizFeedback === 'incorrect') return 'incorrect';
    return 'highlight';
  }

  if (hoveredNodeId === nodeId) return 'hover';
  if (focusedNodeId === nodeId) return 'highlight';

  if (mode === 'warmup' && focusedNodeId && focusedNodeId !== nodeId) {
    return 'faded';
  }

  if (mode === 'active' && quizTargetId && quizTargetId !== nodeId) {
    return 'faded';
  }

  return 'default';
}

export function buildMeshFlags(
  _node: MuscleMemoryNode,
  visualState: MeshVisualState,
): MeshRenderFlags {
  return {
    visible: true,
    visualState,
  };
}
