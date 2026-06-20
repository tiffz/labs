import { getNodesForRegion, ALL_NODES } from './curriculum';
import type { BodyView, MuscleMemoryNode, MuscleRegion } from './types/node';

/** Peel index: higher values hide superficial layers (Proko-style depth study). */
export type LayerPeelDepth = 0 | 1 | 2;

export const LAYER_PEEL_STOPS: ReadonlyArray<{
  depth: LayerPeelDepth;
  label: string;
  hint: string;
}> = [
  {
    depth: 0,
    label: 'All layers',
    hint: 'Surface forms, muscles, and bones together',
  },
  {
    depth: 1,
    label: 'Under the skin',
    hint: 'Hide surface forms; show intermediate and deep structures',
  },
  {
    depth: 2,
    label: 'Skeleton',
    hint: 'Bones, joints, and deep framework only',
  },
] as const;

export const LAYER_DEPTH_LABELS: Record<0 | 1 | 2, string> = {
  0: 'Surface forms',
  1: 'Intermediate',
  2: 'Bones & deep',
};

export function layerPeelDepthLabel(peel: LayerPeelDepth): string {
  return LAYER_PEEL_STOPS.find((stop) => stop.depth === peel)?.label ?? 'All layers';
}

/** Show nodes at or below the selected peel (2 = bones/deep only). */
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
): Record<0 | 1 | 2, MuscleMemoryNode[]> {
  const grouped: Record<0 | 1 | 2, MuscleMemoryNode[]> = { 0: [], 1: [], 2: [] };
  for (const node of nodes) {
    if (!isNodeVisibleAtPeelDepth(node, peelDepth)) continue;
    grouped[node.layerDepth].push(node);
  }
  return grouped;
}
