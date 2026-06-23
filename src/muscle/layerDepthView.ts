import { getNodesForRegion, ALL_NODES } from './curriculum';
import type { BodyView, MuscleLayerDepth, MuscleMemoryNode, MuscleRegion } from './types/node';

/** Peel index: higher values hide superficial layers (Proko-style depth study). */
export type LayerPeelDepth = 0 | 1 | 2 | 3;

export const LAYER_PEEL_STOPS: ReadonlyArray<{
  depth: LayerPeelDepth;
  label: string;
  hint: string;
}> = [
  {
    depth: 0,
    label: 'All layers',
    hint: 'Surface muscles through skeleton together',
  },
  {
    depth: 1,
    label: 'Under the skin',
    hint: 'Hide superficial muscles; show intermediate, deep, and bones',
  },
  {
    depth: 2,
    label: 'Deep muscles',
    hint: 'Hide superficial and intermediate; show deep muscles and skeleton',
  },
  {
    depth: 3,
    label: 'Skeleton',
    hint: 'Bones and joints only',
  },
] as const;

export const LAYER_DEPTH_LABELS: Record<MuscleLayerDepth, string> = {
  0: 'Superficial',
  1: 'Intermediate',
  2: 'Deep',
  3: 'Skeleton',
};

export function layerPeelDepthLabel(peel: LayerPeelDepth): string {
  return LAYER_PEEL_STOPS.find((stop) => stop.depth === peel)?.label ?? 'All layers';
}

/** Show nodes at or below the selected peel (3 = skeleton only). */
export function isNodeVisibleAtPeelDepth(
  node: MuscleMemoryNode,
  peelDepth: LayerPeelDepth,
): boolean {
  return node.layerDepth >= peelDepth;
}

export function defaultLayerPeelForModule(): LayerPeelDepth {
  return 0;
}

export function getNodesForView(bodyView: BodyView, region: MuscleRegion): MuscleMemoryNode[] {
  if (bodyView === 'full_body') return ALL_NODES;
  return getNodesForRegion(region);
}

export function countVisibleRegionNodesAtPeel(
  region: MuscleRegion,
  peelDepth: LayerPeelDepth,
  nodeIds?: ReadonlySet<string>,
): number {
  return getNodesForRegion(region).filter((node) => {
    if (nodeIds && !nodeIds.has(node.id)) return false;
    return isNodeVisibleAtPeelDepth(node, peelDepth);
  }).length;
}

export function countVisibleNodesForView(
  bodyView: BodyView,
  region: MuscleRegion,
  peelDepth: LayerPeelDepth,
): number {
  return getNodesForView(bodyView, region).filter((node) =>
    isNodeVisibleAtPeelDepth(node, peelDepth),
  ).length;
}

export function groupNodesByLayerDepth(
  nodes: readonly MuscleMemoryNode[],
  peelDepth: LayerPeelDepth,
): Record<MuscleLayerDepth, MuscleMemoryNode[]> {
  const grouped: Record<MuscleLayerDepth, MuscleMemoryNode[]> = { 0: [], 1: [], 2: [], 3: [] };
  for (const node of nodes) {
    if (!isNodeVisibleAtPeelDepth(node, peelDepth)) continue;
    grouped[node.layerDepth].push(node);
  }
  return grouped;
}
