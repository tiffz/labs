#!/usr/bin/env node
/**
 * Validates public/muscle/models/manifest.json mesh nodeIds against curriculum TS sources
 * and triangle performance budgets (keep in sync with src/muscle/muscleAssetPerfBudget.ts).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_MESH_TRIS = 25_000;
const MAX_REGION_TRIS = 80_000;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'public/muscle/models/manifest.json');
const nodesDir = path.join(root, 'src/muscle/curriculum/nodes');

function collectCurriculumIds() {
  const ids = new Set();
  for (const file of fs.readdirSync(nodesDir)) {
    if (!file.endsWith('.ts')) continue;
    const text = fs.readFileSync(path.join(nodesDir, file), 'utf8');
    for (const match of text.matchAll(/^\s+'([a-z0-9_]+)',/gm)) {
      ids.add(match[1]);
    }
    for (const match of text.matchAll(/\bid:\s*'([a-z0-9_]+)'/g)) {
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
      if ((mesh.triangleCount ?? 0) > MAX_MESH_TRIS) {
        violations.push(
          `${region}/${mesh.nodeId}: ${mesh.triangleCount} tris exceeds mesh cap ${MAX_MESH_TRIS}`,
        );
      }
    }
    if (regionTotal > MAX_REGION_TRIS) {
      violations.push(`${region}: ${regionTotal} tris exceeds region cap ${MAX_REGION_TRIS}`);
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
      if (mesh.nodeId && !curriculumIds.has(mesh.nodeId)) {
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
