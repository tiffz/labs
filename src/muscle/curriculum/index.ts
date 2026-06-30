import type { MuscleMemoryNode, MuscleRegion } from '../types/node';
import { armNodes } from './nodes/arm';
import { footNodes } from './nodes/foot';
import { fundamentalsNodes } from './nodes/fundamentals';
import { handNodes } from './nodes/hand';
import { legNodes } from './nodes/leg';
import { shoulderNeckNodes } from './nodes/shoulderNeck';
import { torsoNodes } from './nodes/torso';

import { atlasSupplementNodes } from './nodes/atlasSupplement';
import { atlasHeadFaceNodes } from './nodes/atlasHeadFace';
import { ATLAS_MESH_NODES } from './atlasMeshRegistry';

export const NODES_BY_REGION: Record<MuscleRegion, MuscleMemoryNode[]> = {
  anatomy_terms: [],
  fundamentals: fundamentalsNodes,
  torso: torsoNodes,
  shoulder_neck: shoulderNeckNodes,
  arm: armNodes,
  hand: handNodes,
  leg: legNodes,
  foot: footNodes,
};

for (const node of atlasSupplementNodes) {
  NODES_BY_REGION[node.region].push(node);
}

for (const node of atlasHeadFaceNodes) {
  NODES_BY_REGION[node.region].push(node);
}

const CURRICULUM_NODES = Object.values(NODES_BY_REGION).flat();
const CURRICULUM_NODE_ID_SET = new Set(CURRICULUM_NODES.map((node) => node.id));

export const ALL_NODES: MuscleMemoryNode[] = [
  ...CURRICULUM_NODES,
  ...ATLAS_MESH_NODES.filter((node) => !CURRICULUM_NODE_ID_SET.has(node.id)),
];

export const NODE_BY_ID: Map<string, MuscleMemoryNode> = new Map(
  ALL_NODES.map((node) => [node.id, node]),
);

export function getNodesForRegion(region: MuscleRegion, options?: { includeAtlas?: boolean }): MuscleMemoryNode[] {
  const nodes = NODES_BY_REGION[region];
  if (options?.includeAtlas) return nodes;
  return nodes.filter((node) => !node.atlasOnly);
}

export function getNodeById(id: string): MuscleMemoryNode | undefined {
  return NODE_BY_ID.get(id);
}

export function getFundamentalsGateNodes(): MuscleMemoryNode[] {
  return fundamentalsNodes.filter((n) => n.type === 'bone' || n.type === 'joint');
}

export {
  curriculumNodeIdFromZAnatomyName,
  resolveCurriculumNodeId,
  zAnatomyNamesForNodeId,
  Z_ANATOMY_BRIDGE,
} from './zAnatomyBridge';
