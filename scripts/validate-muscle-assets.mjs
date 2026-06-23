#!/usr/bin/env node
/**
 * Validates public/muscle/models/manifest.json mesh nodeIds against curriculum TS sources
 * and triangle performance budgets (keep in sync with src/muscle/muscleAssetPerfBudget.ts).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_MESH_TRIS = 25_000;
const MAX_SKIN_ENVELOPE_TRIS = 44_000;
const SKIN_OVERLAY_CAPS = {
  skin_face: 12_000,
  skin_neck_shoulder: 8_000,
  skin_hand_digits: 10_000,
  skin_foot_digits: 10_000,
  eye_globes: 2_000,
};
const MAX_REGION_TRIS = 80_000;
const ATLAS_REGION_TRIS = 120_000;
const ATLAS_COMPLETE_REGION_TRIS = 400_000;
const OVERLAY_NODE_IDS = new Set([
  'skin_envelope',
  'skin_face',
  'skin_neck_shoulder',
  'skin_hand_digits',
  'skin_foot_digits',
  'eye_globes',
  'skin_limbs',
  'skin_torso',
  'skin_eminences',
]);

const ATLAS_EXPORT_REGIONS = new Set([
  'atlas_supplement',
  'atlas_head_face',
  'atlas_skin',
  'atlas_complete',
]);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'public/muscle/models/manifest.json');
const nodesDir = path.join(root, 'src/muscle/curriculum/nodes');
const atlasRegistryPath = path.join(root, 'src/muscle/curriculum/atlasMeshRegistry.ts');

function collectCurriculumIds() {
  const ids = new Set();
  for (const file of fs.readdirSync(nodesDir)) {
    if (!file.endsWith('.ts')) continue;
    const text = fs.readFileSync(path.join(nodesDir, file), 'utf8');
    for (const match of text.matchAll(/\b(?:bone|muscle|joint)\(\s*'([a-z0-9_]+)'/g)) {
      ids.add(match[1]);
    }
  }
  if (fs.existsSync(atlasRegistryPath)) {
    const text = fs.readFileSync(atlasRegistryPath, 'utf8');
    for (const match of text.matchAll(/\bid:\s*["']([a-z0-9_]+)["']/g)) {
      ids.add(match[1]);
    }
  }
  return ids;
}

function auditTriangleBudgets(manifest) {
  const violations = [];
  for (const [region, entry] of Object.entries(manifest.regions ?? {})) {
    let regionTotal = 0;
    for (const mesh of entry.meshes ?? []) {
      regionTotal += mesh.triangleCount ?? 0;
      const meshCap =
        mesh.nodeId === 'skin_envelope'
          ? MAX_SKIN_ENVELOPE_TRIS
          : SKIN_OVERLAY_CAPS[mesh.nodeId] ?? MAX_MESH_TRIS;
      if ((mesh.triangleCount ?? 0) > meshCap) {
        violations.push(
          `${region}/${mesh.nodeId}: ${mesh.triangleCount} tris exceeds mesh cap ${meshCap}`,
        );
      }
    }
    const regionCap = region === 'atlas_complete'
      ? ATLAS_COMPLETE_REGION_TRIS
      : ATLAS_EXPORT_REGIONS.has(region)
        ? ATLAS_REGION_TRIS
        : MAX_REGION_TRIS;
    if (regionTotal > regionCap) {
      violations.push(`${region}: ${regionTotal} tris exceeds region cap`);
    }
  }
  return violations;
}

function main() {
  if (!fs.existsSync(manifestPath)) {
    console.error('Missing manifest:', manifestPath);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const curriculumIds = collectCurriculumIds();
  const violations = [];

  for (const [region, entry] of Object.entries(manifest.regions ?? {})) {
    for (const mesh of entry.meshes ?? []) {
      if (mesh.nodeId && !curriculumIds.has(mesh.nodeId) && !OVERLAY_NODE_IDS.has(mesh.nodeId)) {
        violations.push(`${region}: unknown nodeId ${mesh.nodeId}`);
      }
    }
    const manifestIds = new Set((entry.meshes ?? []).map((mesh) => mesh.nodeId).filter(Boolean));
    const regionNodesFile = path.join(nodesDir, `${region === 'shoulder_neck' ? 'shoulderNeck' : region}.ts`);
    if (fs.existsSync(regionNodesFile)) {
      const regionText = fs.readFileSync(regionNodesFile, 'utf8');
      const regionNodeIds = [...regionText.matchAll(/^\s+'([a-z0-9_]+)',/gm)].map((m) => m[1]);
      for (const nodeId of regionNodeIds) {
        if (!manifestIds.has(nodeId)) {
          console.warn(`muscle:validate-assets note: ${region}/${nodeId} missing from manifest (procedural fill)`);
        }
      }
    }
  }

  violations.push(...auditTriangleBudgets(manifest));

  if (violations.length) {
    console.error('Asset manifest violations:\n' + violations.join('\n'));
    process.exit(1);
  }

  console.log(`muscle:validate-assets OK (${curriculumIds.size} curriculum ids, triangle budgets)`);
}

main();
