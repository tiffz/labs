import type { Mesh } from 'three';
import { isPlausibleAnatomyMesh } from './extractGlbMeshes';

export function meshTriangleCount(mesh: Mesh): number {
  const geometry = mesh.geometry;
  const index = geometry.index;
  if (index) return Math.floor(index.count / 3);
  const position = geometry.attributes.position;
  return position ? Math.floor(position.count / 3) : 0;
}

function meshPlausibilityScore(mesh: Mesh): number {
  const geometry = mesh.geometry.clone();
  mesh.updateWorldMatrix(true, false);
  geometry.applyMatrix4(mesh.matrixWorld);
  if (!isPlausibleAnatomyMesh(geometry)) return -1;
  return meshTriangleCount(mesh);
}

/** When atlas and module GLBs share a node id, keep the best-placed, highest-detail mesh. */
export function dedupeMeshesPreferDetail(meshes: readonly Mesh[]): Mesh[] {
  const byId = new Map<string, Mesh>();
  for (const mesh of meshes) {
    const existing = byId.get(mesh.name);
    if (!existing) {
      byId.set(mesh.name, mesh);
      continue;
    }
    const nextScore = meshPlausibilityScore(mesh);
    const existingScore = meshPlausibilityScore(existing);
    if (nextScore > existingScore) {
      byId.set(mesh.name, mesh);
    }
  }
  return [...byId.values()];
}

/**
 * Merge atlas + module GLBs. Later groups win over earlier ones for the same node id
 * (curriculum/module exports beat decimated atlas_complete copies).
 */
export function mergeFullBodyMeshes(...groups: readonly (readonly Mesh[])[]): Mesh[] {
  const byId = new Map<string, { mesh: Mesh; groupIndex: number; score: number }>();

  groups.forEach((group, groupIndex) => {
    for (const mesh of group) {
      const score = meshPlausibilityScore(mesh);
      if (score < 0) continue;

      const existing = byId.get(mesh.name);
      if (
        !existing
        || groupIndex > existing.groupIndex
        || (groupIndex === existing.groupIndex && score > existing.score)
      ) {
        byId.set(mesh.name, { mesh, groupIndex, score });
      }
    }
  });

  return [...byId.values()].map((entry) => entry.mesh);
}
