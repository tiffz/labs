import { useCallback } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { collectStudyGroupIdsForNode } from '../../curriculum/resolveStudyGroupForNode';
import { useMuscleStore } from '../../store/useMuscleStore';
import type { BodyView, MuscleRegion } from '../../types/node';
import { pickStructureFromIntersections } from './pickStructureFromIntersections';

function resolveExploreTarget(
  nodeId: string,
  bodyView: BodyView,
  activeModuleId: MuscleRegion,
  focusedGroupNodeIds: string[] | null,
): { kind: 'group'; nodeIds: string[] } | { kind: 'node'; nodeId: string } {
  const groupIds = collectStudyGroupIdsForNode(nodeId, {
    moduleId: bodyView === 'region' ? activeModuleId : undefined,
  });
  if (groupIds) {
    const groupFocused =
      Boolean(focusedGroupNodeIds) &&
      groupIds.length === focusedGroupNodeIds!.length &&
      groupIds.every((id) => focusedGroupNodeIds!.includes(id));
    if (groupFocused) return { kind: 'node', nodeId };
    return { kind: 'group', nodeIds: groupIds };
  }
  return { kind: 'node', nodeId };
}

export function useAnatomyMeshInteraction(nodeId: string) {
  const handleClick = useCallback((event?: ThreeEvent<MouseEvent>) => {
    const state = useMuscleStore.getState();
    if (state.mode === 'warmup') {
      const picked =
        event &&
        pickStructureFromIntersections(event.intersections, state.layerPeelDepth);
      const targetId = picked ?? nodeId;
      const target = resolveExploreTarget(
        targetId,
        state.bodyView,
        state.activeModuleId,
        state.focusedGroupNodeIds,
      );
      if (target.kind === 'group') state.focusStudyGroup(target.nodeIds);
      else state.focusStructure(target.nodeId);
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
