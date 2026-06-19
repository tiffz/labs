import { useCallback } from 'react';
import { useMuscleStore } from '../../store/useMuscleStore';

export function useAnatomyMeshInteraction(nodeId: string) {
  const handleClick = useCallback(() => {
    const state = useMuscleStore.getState();
    if (state.mode === 'warmup') {
      state.selectNode(nodeId);
      return;
    }
    if (state.mode === 'active' && state.quiz.feedback === 'idle') {
      void state.submitAnswer(nodeId);
    }
  }, [nodeId]);

  const handlePointerOver = useCallback(() => {
    useMuscleStore.getState().setHoveredNodeId(nodeId);
  }, [nodeId]);

  const handlePointerOut = useCallback(() => {
    const state = useMuscleStore.getState();
    if (state.hoveredNodeId === nodeId) {
      state.setHoveredNodeId(null);
    }
  }, [nodeId]);

  return { handleClick, handlePointerOver, handlePointerOut };
}
