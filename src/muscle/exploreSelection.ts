import { getNodeById } from './curriculum';
import { collectNodeIdsFromGroup, getStudyGroupsForModule } from './curriculum/studyGroups';
import { getNodesForView, isNodeVisibleAtPeelDepth, type LayerPeelDepth } from './layerDepthView';
import type { BodyView, MuscleMemoryNode, MuscleRegion } from './types/node';

function isExplorableNode(node: MuscleMemoryNode, peelDepth: LayerPeelDepth): boolean {
  return !node.atlasOnly && node.isSurfaceForm && isNodeVisibleAtPeelDepth(node, peelDepth);
}

/** First curriculum structure to show when entering Warmup explore for a module. */
export function getDefaultExploreNodeId(
  bodyView: BodyView,
  activeModuleId: MuscleRegion,
  peelDepth: LayerPeelDepth,
): string | null {
  if (activeModuleId === 'anatomy_terms') return null;

  if (bodyView === 'region') {
    const groups = getStudyGroupsForModule(activeModuleId);
    for (const group of groups) {
      for (const nodeId of collectNodeIdsFromGroup(group)) {
        const node = getNodeById(nodeId);
        if (node && isExplorableNode(node, peelDepth)) return nodeId;
      }
    }
  }

  const fallback = getNodesForView(bodyView, activeModuleId).find((node) =>
    isExplorableNode(node, peelDepth),
  );
  return fallback?.id ?? null;
}

function firstExplorableGroupNodeIds(
  activeModuleId: MuscleRegion,
  peelDepth: LayerPeelDepth,
): string[] | null {
  for (const group of getStudyGroupsForModule(activeModuleId)) {
    const ids = collectNodeIdsFromGroup(group).filter((nodeId) => {
      const node = getNodeById(nodeId);
      return node && isExplorableNode(node, peelDepth);
    });
    if (ids.length > 0) return ids;
  }
  return null;
}

export function autoFocusExploreSelection(
  bodyView: BodyView,
  activeModuleId: MuscleRegion,
  peelDepth: LayerPeelDepth,
  focusStructure: (nodeId: string | null) => void,
  focusStudyGroup: (nodeIds: string[]) => void,
): void {
  if (bodyView === 'region' && activeModuleId !== 'anatomy_terms') {
    const groupIds = firstExplorableGroupNodeIds(activeModuleId, peelDepth);
    if (groupIds) {
      focusStudyGroup(groupIds);
      return;
    }
  }
  const nodeId = getDefaultExploreNodeId(bodyView, activeModuleId, peelDepth);
  if (nodeId) focusStructure(nodeId);
}
