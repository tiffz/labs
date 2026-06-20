import type { Mesh } from 'three';

export function meshTriangleCount(mesh: Mesh): number {
  const geometry = mesh.geometry;
  const index = geometry.index;
  if (index) return Math.floor(index.count / 3);
  const position = geometry.attributes.position;
  return position ? Math.floor(position.count / 3) : 0;
}

/** When atlas and module GLBs share a node id, keep the higher-detail mesh. */
export function dedupeMeshesPreferDetail(meshes: readonly Mesh[]): Mesh[] {
  const byId = new Map<string, Mesh>();
  for (const mesh of meshes) {
    const existing = byId.get(mesh.name);
    if (!existing || meshTriangleCount(mesh) > meshTriangleCount(existing)) {
      byId.set(mesh.name, mesh);
    }
  }
  return [...byId.values()];
}

export function mergeFullBodyMeshes(...groups: readonly (readonly Mesh[])[]): Mesh[] {
  return dedupeMeshesPreferDetail(groups.flat());
}
