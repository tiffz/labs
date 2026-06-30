import type { MuscleMemoryNode } from '../../types/node';

export type MeshVisualState =
  | 'default'
  | 'faded'
  | 'group_ensemble'
  | 'group_member'
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
  focusedGroupNodeIds: string[] | null;
  hoveredGroupNodeIds: string[] | null;
  hoveredNodeId: string | null;
  quizTargetId: string | null;
  quizFeedback: 'idle' | 'correct' | 'incorrect';
  mode: 'warmup' | 'active';
}): MeshVisualState {
  const {
    nodeId,
    focusedNodeId,
    focusedGroupNodeIds,
    hoveredGroupNodeIds,
    hoveredNodeId,
    quizTargetId,
    quizFeedback,
    mode,
  } = params;

  if (mode === 'active' && quizTargetId === nodeId) {
    if (quizFeedback === 'correct') return 'correct';
    if (quizFeedback === 'incorrect') return 'incorrect';
    return 'highlight';
  }

  if (hoveredNodeId === nodeId) return 'hover';
  if (focusedNodeId === nodeId) return 'highlight';
  if (focusedGroupNodeIds?.includes(nodeId)) {
    return focusedNodeId ? 'group_member' : 'group_ensemble';
  }
  if (hoveredGroupNodeIds?.includes(nodeId)) {
    return hoveredNodeId ? 'group_member' : 'group_ensemble';
  }

  const hasWarmupFocus =
    Boolean(focusedNodeId) ||
    Boolean(focusedGroupNodeIds && focusedGroupNodeIds.length > 0) ||
    Boolean(hoveredGroupNodeIds && hoveredGroupNodeIds.length > 0);
  if (mode === 'warmup' && hasWarmupFocus) {
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
