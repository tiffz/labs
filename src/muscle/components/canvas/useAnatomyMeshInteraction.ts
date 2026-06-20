import { useCallback } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useMuscleStore } from '../../store/useMuscleStore';
import { pickStructureFromIntersections } from './pickStructureFromIntersections';

export function useAnatomyMeshInteraction(nodeId: string) {
  const handleClick = useCallback((event?: ThreeEvent<MouseEvent>) => {
    const state = useMuscleStore.getState();
    if (state.mode === 'warmup') {
      const picked =
        event &&
        pickStructureFromIntersections(event.intersections, state.layerPeelDepth);
      state.focusStructure(picked ?? nodeId);
      return;
    }
    if (state.mode === 'active' && state.quiz.feedback === 'idle') {
      void state.submitAnswer(nodeId);
    }
  }, [nodeId]);

  const handlePointerOver = useCallback((event?: ThreeEvent<PointerEvent>) => {
    const state = useMuscleStore.getState();
    if (state.mode === 'warmup' && event) {
      const picked = pickStructureFromIntersections(event.intersections, state.layerPeelDepth);
      if (picked) {
        state.setHoveredNodeId(picked);
        return;
      }
    }
    state.setHoveredNodeId(nodeId);
  }, [nodeId]);

  const handlePointerOut = useCallback(() => {
    const state = useMuscleStore.getState();
    if (state.hoveredNodeId === nodeId) {
      state.setHoveredNodeId(null);
    }
  }, [nodeId]);

  return { handleClick, handlePointerOver, handlePointerOut };
}
