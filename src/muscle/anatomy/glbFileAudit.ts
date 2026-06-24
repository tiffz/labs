import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveCurriculumNodeId } from '../curriculum/zAnatomyBridge';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export function readGlbJson(glbPath: string): { meshes?: Array<{ name?: string }>; nodes?: Array<{ name?: string; mesh?: number }> } {
  const buf = fs.readFileSync(glbPath);
  if (buf.readUInt32LE(0) !== 0x46546c67) {
    throw new Error(`Not a GLB: ${glbPath}`);
  }
  const jsonChunkLength = buf.readUInt32LE(12);
  const jsonStart = 20;
  return JSON.parse(buf.slice(jsonStart, jsonStart + jsonChunkLength).toString('utf8'));
}

export function listGlbMeshNames(glbRelativePath: string): string[] {
  const glbPath = path.join(REPO_ROOT, glbRelativePath);
  if (!fs.existsSync(glbPath)) return [];
  const doc = readGlbJson(glbPath);
  const meshNames = new Set<string>();
  for (const mesh of doc.meshes ?? []) {
    if (mesh.name) meshNames.add(mesh.name);
  }
  for (const node of doc.nodes ?? []) {
    if (node.mesh !== undefined && node.name) meshNames.add(node.name);
  }
  return [...meshNames];
}

export type GlbResolutionAudit = {
  glbPath: string;
  meshNames: string[];
  missingNodeIds: string[];
  unmappedMeshNames: string[];
};

/** Every mesh in the GLB must resolve; every required node id must be reachable from at least one mesh name. */
export function auditGlbMeshResolution(
  glbRelativePath: string,
  requiredNodeIds: readonly string[],
): GlbResolutionAudit {
  const glbPath = path.join(REPO_ROOT, glbRelativePath);
  const meshNames = listGlbMeshNames(glbRelativePath);
  const resolvedIds = new Set<string>();
  const unmappedMeshNames: string[] = [];

  for (const name of meshNames) {
    const nodeId = resolveCurriculumNodeId(name);
    if (!nodeId) {
      unmappedMeshNames.push(name);
      continue;
    }
    resolvedIds.add(nodeId);
  }

  const missingNodeIds = requiredNodeIds.filter((nodeId) => !resolvedIds.has(nodeId));

  return { glbPath, meshNames, missingNodeIds, unmappedMeshNames };
}
