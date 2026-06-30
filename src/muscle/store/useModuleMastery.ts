import { useMemo } from 'react';
import { getNodesForRegion } from '../curriculum';
import { getTermsGateIds } from '../curriculum/anatomyTerms';
import { getNodesForView } from '../layerDepthView';
import { computeModuleMastery } from '../srs/deckPlanner';
import { useMuscleStore } from './useMuscleStore';

/** Derived mastery counts — do not select getModuleMastery() inline (new object every read). */
export function useModuleMastery() {
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const bodyView = useMuscleStore((s) => s.bodyView);
  const atlasTabActive = useMuscleStore((s) => s.atlasTabActive);
  const progressByNode = useMuscleStore((s) => s.progressByNode);
  return useMemo(() => {
    if (activeModuleId === 'anatomy_terms' && !atlasTabActive) {
      const ids = getTermsGateIds();
      const mastered = ids.filter(
        (id) => (progressByNode.get(id)?.repetitionCount ?? 0) >= 3,
      ).length;
      return { mastered, total: ids.length };
    }
    const nodes =
      bodyView === 'full_body' && atlasTabActive
        ? getNodesForView('full_body', activeModuleId).filter((n) => n.isSurfaceForm && !n.atlasOnly)
        : getNodesForRegion(activeModuleId).filter((n) => n.isSurfaceForm && !n.atlasOnly);
    return computeModuleMastery(nodes, progressByNode, 3);
  }, [activeModuleId, atlasTabActive, bodyView, progressByNode]);
}
