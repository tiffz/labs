#!/usr/bin/env node
/**
 * Regenerate src/muscle/curriculum/zAnatomyBridge.ts from z_anatomy_name_map.csv
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = path.join(root, 'tools/muscle-anatomy/z_anatomy_name_map.csv');
const outPath = path.join(root, 'src/muscle/curriculum/zAnatomyBridge.ts');

const text = fs.readFileSync(csvPath, 'utf8');
const rows = [];
for (const line of text.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('z_anatomy_name')) continue;
  const [zAnatomyName, nodeId, region] = trimmed.split(',').map((s) => s.trim());
  if (zAnatomyName && nodeId && region) {
    rows.push({ zAnatomyName, nodeId, region });
  }
}

const body = `/**
 * Maps Z-Anatomy Blender object names → Muscle Memory curriculum ids.
 * Source of truth: tools/muscle-anatomy/z_anatomy_name_map.csv
 * Regenerate: npm run muscle:sync-bridge
 */
import { armNodes } from './nodes/arm';
import { footNodes } from './nodes/foot';
import { fundamentalsNodes } from './nodes/fundamentals';
import { handNodes } from './nodes/hand';
import { legNodes } from './nodes/leg';
import { shoulderNeckNodes } from './nodes/shoulderNeck';
import { torsoNodes } from './nodes/torso';
import { atlasSupplementNodes } from './nodes/atlasSupplement';
import { atlasHeadFaceNodes } from './nodes/atlasHeadFace';
import { ATLAS_MESH_NODE_IDS } from './atlasMeshRegistry';

export type ZAnatomyBridgeEntry = {
  zAnatomyName: string;
  nodeId: string;
  region: string;
};

export const Z_ANATOMY_BRIDGE: readonly ZAnatomyBridgeEntry[] = [
${rows.map((r) => `  { zAnatomyName: ${JSON.stringify(r.zAnatomyName)}, nodeId: ${JSON.stringify(r.nodeId)}, region: ${JSON.stringify(r.region)} },`).join('\n')}
] as const;

export const SKIN_OVERLAY_MESH_IDS = new Set([
  'skin_envelope',
  'eye_globes',
  'skin_face',
  'skin_neck_shoulder',
  'skin_back',
  'skin_limbs',
  'skin_torso',
  'skin_hand_digits',
  'skin_foot_digits',
  'skin_eminences',
]);

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

/** Atlas-only nodes exported with curriculum ids as GLB mesh names (not Z-Anatomy aliases). */
const ATLAS_ONLY_NODE_IDS = new Set(
  [...atlasSupplementNodes, ...atlasHeadFaceNodes].map((node) => node.id),
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
  if (SKIN_OVERLAY_MESH_IDS.has(meshName)) return meshName;
  if (/^Skin_Generated/i.test(meshName) || /^grp\\d/i.test(meshName)) return 'skin_back';
  if (ATLAS_ONLY_NODE_IDS.has(meshName)) return meshName;
  if (CURRICULUM_NODE_IDS.has(meshName)) return meshName;
  if (ATLAS_MESH_NODE_IDS.has(meshName)) return meshName;
  return nodeIdByZAnatomyName.get(meshName);
}

/** Known Z-Anatomy source names that collapse into one curriculum node. */
export function zAnatomyNamesForNodeId(nodeId: string): readonly string[] {
  return zAnatomyNamesByNodeId.get(nodeId) ?? [];
}
`;

fs.writeFileSync(outPath, body, 'utf8');
console.log(`muscle:sync-bridge wrote ${rows.length} rows -> ${path.relative(root, outPath)}`);
