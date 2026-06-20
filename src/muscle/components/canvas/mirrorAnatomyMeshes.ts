import * as THREE from 'three';
import type { Mesh } from 'three';

/** Mirror meshes across the sagittal plane (x = 0) for full-body atlas silhouette fill. */
export function createAtlasMirrorMeshes(meshes: readonly Mesh[]): Mesh[] {
  if (meshes.length === 0) return [];

  return meshes.map((source) => {
    const geometry = source.geometry.clone();
    const positions = geometry.getAttribute('position');
    if (positions) {
      for (let i = 0; i < positions.count; i++) {
        positions.setX(i, -positions.getX(i));
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
    }

    const mesh = new THREE.Mesh(geometry, source.material);
    mesh.name = `${source.name}__atlas_mirror`;
    mesh.userData.atlasMirror = true;
    return mesh;
  });
}
