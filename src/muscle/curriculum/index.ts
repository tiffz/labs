import type { MuscleMemoryNode, MuscleRegion } from '../types/node';
import { armNodes } from './nodes/arm';
import { footNodes } from './nodes/foot';
import { fundamentalsNodes } from './nodes/fundamentals';
import { handNodes } from './nodes/hand';
import { legNodes } from './nodes/leg';
import { shoulderNeckNodes } from './nodes/shoulderNeck';
import { torsoNodes } from './nodes/torso';

export const NODES_BY_REGION: Record<MuscleRegion, MuscleMemoryNode[]> = {
  fundamentals: fundamentalsNodes,
  torso: torsoNodes,
  shoulder_neck: shoulderNeckNodes,
  arm: armNodes,
  hand: handNodes,
  leg: legNodes,
  foot: footNodes,
};

export const ALL_NODES: MuscleMemoryNode[] = Object.values(NODES_BY_REGION).flat();

export const NODE_BY_ID: Map<string, MuscleMemoryNode> = new Map(
  ALL_NODES.map((node) => [node.id, node]),
);

export function getNodesForRegion(region: MuscleRegion): MuscleMemoryNode[] {
  return NODES_BY_REGION[region];
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
