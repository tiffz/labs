import { getNodesForRegion, ALL_NODES } from './curriculum';
import type { BodyView, MuscleLayerDepth, MuscleMemoryNode, MuscleRegion } from './types/node';

/** Discrete peel stops on the depth slider (notched — no in-between states). */
export type LayerPeelDepth = 0 | 1 | 2 | 3;

export const LAYER_PEEL_STOPS: ReadonlyArray<{
  depth: LayerPeelDepth;
  label: string;
  hint: string;
}> = [
  {
    depth: 0,
    label: 'Full muscle',
    hint: 'Every muscle layered over the skeleton',
  },
  {
    depth: 1,
    label: 'Below surface',
    hint: 'Hide superficial muscles; keep intermediate, deep, and bones',
  },
  {
    depth: 2,
    label: 'Deep muscles',
    hint: 'Hide superficial and intermediate; deep muscles and skeleton',
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
  return LAYER_PEEL_STOPS.find((stop) => stop.depth === peel)?.label ?? 'Full figure';
}

/** Minimum anatomical layerDepth visible at this peel (null = all muscle/bone nodes). */
export function muscleLayerThresholdForPeel(peelDepth: LayerPeelDepth): MuscleLayerDepth | null {
  if (peelDepth <= 0) return null;
  return peelDepth as MuscleLayerDepth;
}

/** Show nodes at or below the selected peel (4 = skeleton only). */
export function isNodeVisibleAtPeelDepth(
  node: MuscleMemoryNode,
  peelDepth: LayerPeelDepth,
): boolean {
  const threshold = muscleLayerThresholdForPeel(peelDepth);
  if (threshold === null) return true;
  return node.layerDepth >= threshold;
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

export function countGlossaryNodesForView(
  bodyView: BodyView,
  region: MuscleRegion,
  peelDepth: LayerPeelDepth,
  showDetailStructures: boolean,
): number {
  return getNodesForView(bodyView, region).filter((node) => {
    if (!isNodeVisibleAtPeelDepth(node, peelDepth)) return false;
    if (!showDetailStructures && node.atlasOnly) return false;
    return true;
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
