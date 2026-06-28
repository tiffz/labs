import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { resolveCurriculumNodeId } from '../../curriculum/zAnatomyBridge';
import { prepareAnatomyGeometry } from './applyMeshBvh';

/** Drop origin-placed garbage meshes that slip through export (e.g. tendinous arch duplicate). */
export function isPlausibleAnatomyMesh(geometry: THREE.BufferGeometry): boolean {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box || box.isEmpty()) return false;

  const size = box.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.y, size.z);
  if (span < 0.008) return false;

  const center = box.getCenter(new THREE.Vector3());
  const originDist = center.length();
  if (originDist < 0.05 && span < 0.25) return false;
  if (originDist < 0.12 && span > 1.2) return false;

  return true;
}

function resolveMeshCurriculumId(object: THREE.Object3D): string | undefined {
  const direct = resolveCurriculumNodeId(object.name);
  if (direct) return direct;

  const userNodeId = object.userData?.nodeId;
  if (typeof userNodeId === 'string' && resolveCurriculumNodeId(userNodeId)) {
    return userNodeId;
  }

  let parent = object.parent;
  while (parent) {
    const parentId =
      (typeof parent.userData?.nodeId === 'string' ? parent.userData.nodeId : undefined) ??
      parent.name;
    const resolved = resolveCurriculumNodeId(parentId);
    if (resolved) return resolved;
    parent = parent.parent;
  }

  return undefined;
}

function mergeMeshesByNodeId(meshes: THREE.Mesh[]): THREE.Mesh[] {
  const byId = new Map<string, THREE.Mesh[]>();
  for (const mesh of meshes) {
    const list = byId.get(mesh.name) ?? [];
    list.push(mesh);
    byId.set(mesh.name, list);
  }

  const merged: THREE.Mesh[] = [];
  for (const [nodeId, group] of byId) {
    if (group.length === 1) {
      merged.push(group[0]!);
      continue;
    }
    const combined = mergeGeometries(
      group.map((mesh) => mesh.geometry),
      false,
    );
    if (!combined) continue;
    merged.push(new THREE.Mesh(combined, group[0]!.material));
    merged.at(-1)!.name = nodeId;
  }
  return merged;
}

/** Flatten GLB scene meshes with world transforms baked into each root-level mesh. */
export function extractGlbMeshes(
  scene: THREE.Object3D,
  shouldInclude: (meshName: string) => boolean = () => true,
): THREE.Mesh[] {
  scene.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];

  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (child.name === 'Cube' || /^Cube\.\d+$/.test(child.name)) return;
    const nodeId = resolveMeshCurriculumId(child);
    if (!nodeId || !shouldInclude(nodeId)) return;

    child.updateWorldMatrix(true, false);
    const geometry = prepareAnatomyGeometry(child.geometry.clone());
    geometry.applyMatrix4(child.matrixWorld);
    if (!isPlausibleAnatomyMesh(geometry)) return;
    const mesh = new THREE.Mesh(geometry, child.material);
    mesh.name = nodeId;
    meshes.push(mesh);
  });

  return mergeMeshesByNodeId(meshes);
}

/** Orbit target after staging transform — center of the fitted anatomy volume. */
export function computeStageOrbitTarget(
  meshes: readonly THREE.Mesh[],
  layout: { position: [number, number, number]; scale: number },
): [number, number, number] {
  const box = new THREE.Box3();
  const stageMatrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...layout.position),
    new THREE.Quaternion(),
    new THREE.Vector3(layout.scale, layout.scale, layout.scale),
  );

  for (const mesh of meshes) {
    const geometry = mesh.geometry.clone();
    geometry.applyMatrix4(stageMatrix);
    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      box.union(geometry.boundingBox);
    }
  }

  if (box.isEmpty()) {
    return [0, 0.875, 0];
  }

  const center = box.getCenter(new THREE.Vector3());
  return [center.x, center.y, center.z];
}

/** Fit Z-Anatomy exports into the curriculum's ~2-unit-tall staging volume. */
export type AnatomyGroupTransformOptions = {
  /**
   * Pin x=0 at the sagittal plane with the .r export on +X (study side).
   * Avoids centering X, which splits one-sided anatomy across both halves.
   */
  sagittalSplit?: boolean;
};

export function computeAnatomyGroupTransform(
  meshes: readonly THREE.Mesh[],
  options?: AnatomyGroupTransformOptions,
): {
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

  if (options?.sagittalSplit) {
    return {
      scale,
      position: [-box.min.x * scale, -box.min.y * scale, -center.z * scale],
    };
  }

  return {
    scale,
    position: [-center.x * scale, -box.min.y * scale, -center.z * scale],
  };
}
