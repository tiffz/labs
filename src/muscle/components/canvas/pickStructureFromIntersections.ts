import type { Intersection, Object3D } from 'three';
import { getNodeById, resolveCurriculumNodeId } from '../../curriculum';
import { isNodeVisibleAtPeelDepth, type LayerPeelDepth } from '../../layerDepthView';
import type { MuscleMemoryNode } from '../../types/node';

const TYPE_PRIORITY: Record<MuscleMemoryNode['type'], number> = {
  muscle: 0,
  joint: 1,
  bone: 2,
};

export function nodeIdFromRaycastObject(object: Object3D): string | undefined {
  if (object.name.endsWith('__atlas_mirror')) return undefined;
  return resolveCurriculumNodeId(object.name);
}

/** Prefer superficial (low layerDepth) structures when a ray hits stacked anatomy. */
export function pickStructureFromIntersections(
  intersections: readonly Intersection[],
  peelDepth: LayerPeelDepth,
): string | undefined {
  const candidates: Array<{ nodeId: string; layerDepth: number; typeRank: number; distance: number }> =
    [];

  for (const hit of intersections) {
    const nodeId = nodeIdFromRaycastObject(hit.object);
    if (!nodeId) continue;
    const node = getNodeById(nodeId);
    if (!node || !isNodeVisibleAtPeelDepth(node, peelDepth)) continue;
    candidates.push({
      nodeId,
      layerDepth: node.layerDepth,
      typeRank: TYPE_PRIORITY[node.type],
      distance: hit.distance,
    });
  }

  if (candidates.length === 0) return undefined;

  candidates.sort((a, b) => {
    if (a.layerDepth !== b.layerDepth) return a.layerDepth - b.layerDepth;
    if (a.typeRank !== b.typeRank) return a.typeRank - b.typeRank;
    return a.distance - b.distance;
  });

  return candidates[0]!.nodeId;
}
