import * as THREE from 'three';
import { prepareAnatomyGeometry } from './applyMeshBvh';

/** Flatten GLB scene meshes with world transforms baked into each root-level mesh. */
export function extractGlbMeshes(
  scene: THREE.Object3D,
  shouldInclude: (meshName: string) => boolean = () => true,
): THREE.Mesh[] {
  scene.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];

  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (!shouldInclude(child.name)) return;

    child.updateWorldMatrix(true, false);
    const geometry = prepareAnatomyGeometry(child.geometry.clone());
    geometry.applyMatrix4(child.matrixWorld);
    const mesh = new THREE.Mesh(geometry, child.material);
    mesh.name = child.name;
    meshes.push(mesh);
  });

  return meshes;
}

/** Fit Z-Anatomy exports into the curriculum's ~2-unit-tall staging volume. */
export function computeAnatomyGroupTransform(meshes: readonly THREE.Mesh[]): {
  position: [number, number, number];
  scale: number;
} {
  const box = new THREE.Box3();
  for (const mesh of meshes) {
    box.expandByObject(mesh);
  }
  if (box.isEmpty()) {
    return { position: [0, 0, 0], scale: 1 };
  }

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const height = Math.max(size.y, 0.001);
  const scale = 1.75 / height;

  return {
    scale,
    position: [-center.x * scale, -box.min.y * scale, -center.z * scale],
  };
}
