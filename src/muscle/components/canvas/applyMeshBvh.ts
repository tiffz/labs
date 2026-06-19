import { BufferGeometry, Mesh } from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';

let bvhRaycastInstalled = false;

export function ensureBvhRaycast(): void {
  if (bvhRaycastInstalled) return;
  Mesh.prototype.raycast = acceleratedRaycast;
  bvhRaycastInstalled = true;
}

export function prepareAnatomyGeometry(geometry: BufferGeometry): BufferGeometry {
  ensureBvhRaycast();
  if (!geometry.boundsTree) {
    try {
      geometry.boundsTree = new MeshBVH(geometry) as BufferGeometry['boundsTree'];
    } catch {
      // Some Draco exports fail BVH build; keep geometry renderable without accelerated picking.
    }
  }
  return geometry;
}
