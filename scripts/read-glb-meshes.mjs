#!/usr/bin/env node
/**
 * Parse GLB JSON chunk and list mesh / node names.
 * Used by muscle runtime mesh audit (no Blender required).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function readGlbJson(glbPath) {
  const buf = fs.readFileSync(glbPath);
  if (buf.readUInt32LE(0) !== 0x46546c67) {
    throw new Error(`Not a GLB: ${glbPath}`);
  }
  const jsonChunkLength = buf.readUInt32LE(12);
  const jsonStart = 20;
  return JSON.parse(buf.slice(jsonStart, jsonStart + jsonChunkLength).toString('utf8'));
}

export function listGlbMeshNames(glbPath) {
  const doc = readGlbJson(glbPath);
  const meshNames = new Set();
  for (const mesh of doc.meshes ?? []) {
    if (mesh.name) meshNames.add(mesh.name);
  }
  for (const node of doc.nodes ?? []) {
    if (node.mesh !== undefined && node.name) meshNames.add(node.name);
  }
  return [...meshNames];
}

export function auditGlbForNodeIds(glbRelativePath, requiredNodeIds) {
  const glbPath = path.join(root, glbRelativePath);
  if (!fs.existsSync(glbPath)) {
    return { glbPath, missing: requiredNodeIds, meshNames: [] };
  }
  const meshNames = listGlbMeshNames(glbPath);
  const nameSet = new Set(meshNames);
  const missing = requiredNodeIds.filter((id) => !nameSet.has(id));
  return { glbPath, meshNames, missing };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const rel = process.argv[2];
  if (!rel) {
    console.error('Usage: node scripts/read-glb-meshes.mjs public/muscle/models/foo.glb');
    process.exit(1);
  }
  const names = listGlbMeshNames(path.join(root, rel));
  console.log(names.sort().join('\n'));
}
