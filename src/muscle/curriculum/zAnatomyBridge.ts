/**
 * Maps Z-Anatomy Blender object names → Muscle Memory curriculum ids.
 * Source of truth for authoring: tools/muscle-anatomy/z_anatomy_name_map.csv
 * Regenerate this table when the CSV changes (see tools/muscle-anatomy/README.md).
 */
import { armNodes } from './nodes/arm';
import { footNodes } from './nodes/foot';
import { fundamentalsNodes } from './nodes/fundamentals';
import { handNodes } from './nodes/hand';
import { legNodes } from './nodes/leg';
import { shoulderNeckNodes } from './nodes/shoulderNeck';
import { torsoNodes } from './nodes/torso';

export type ZAnatomyBridgeEntry = {
  zAnatomyName: string;
  nodeId: string;
  region: string;
};

export const Z_ANATOMY_BRIDGE: readonly ZAnatomyBridgeEntry[] = [
  { zAnatomyName: 'Clavicular part of deltoid muscle.r', nodeId: 'muscle_deltoid_anterior', region: 'shoulder_neck' },
  { zAnatomyName: 'Long head of biceps brachii muscle.r', nodeId: 'muscle_biceps_brachii', region: 'arm' },
  { zAnatomyName: 'Rectus abdominis muscle.r', nodeId: 'muscle_rectus_abdominis', region: 'torso' },
  { zAnatomyName: 'Humerus.r', nodeId: 'bone_humerus', region: 'fundamentals' },
] as const;

const CURRICULUM_NODE_IDS = new Set(
  [
    ...fundamentalsNodes,
    ...torsoNodes,
    ...shoulderNeckNodes,
    ...armNodes,
    ...handNodes,
    ...legNodes,
    ...footNodes,
  ].map((node) => node.id),
);

const zAnatomyNamesByNodeId = new Map<string, string[]>();
const nodeIdByZAnatomyName = new Map<string, string>();

for (const row of Z_ANATOMY_BRIDGE) {
  nodeIdByZAnatomyName.set(row.zAnatomyName, row.nodeId);
  const list = zAnatomyNamesByNodeId.get(row.nodeId) ?? [];
  list.push(row.zAnatomyName);
  zAnatomyNamesByNodeId.set(row.nodeId, list);
}

/** Curriculum node id for a Z-Anatomy mesh object name (if mapped). */
export function curriculumNodeIdFromZAnatomyName(zAnatomyName: string): string | undefined {
  return nodeIdByZAnatomyName.get(zAnatomyName);
}

/** Resolve a GLB mesh name to a curriculum node id (direct id or Z-Anatomy alias). */
export function resolveCurriculumNodeId(meshName: string): string | undefined {
  if (CURRICULUM_NODE_IDS.has(meshName)) return meshName;
  return nodeIdByZAnatomyName.get(meshName);
}

/** Known Z-Anatomy source names that collapse into one curriculum node. */
export function zAnatomyNamesForNodeId(nodeId: string): readonly string[] {
  return zAnatomyNamesByNodeId.get(nodeId) ?? [];
}
