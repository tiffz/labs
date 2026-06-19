import { useMemo } from 'react';
import { getNodesForRegion } from '../curriculum';
import { computeModuleMastery } from '../srs/deckPlanner';
import { useMuscleStore } from './useMuscleStore';

/** Derived mastery counts — do not select getModuleMastery() inline (new object every read). */
export function useModuleMastery() {
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const progressByNode = useMuscleStore((s) => s.progressByNode);
  return useMemo(() => {
    const nodes = getNodesForRegion(activeModuleId).filter((n) => n.isSurfaceForm);
    return computeModuleMastery(nodes, progressByNode, 3);
  }, [activeModuleId, progressByNode]);
}
