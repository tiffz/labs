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
      // drei ships its own nested three-mesh-bvh (0.8.x) whose MeshBVH type
      // augments BufferGeometry['boundsTree']; our root install is 0.9.x.
      // Runtime-compatible for raycast acceleration, so bridge the two type
      // identities through unknown.
      geometry.boundsTree = new MeshBVH(geometry) as unknown as BufferGeometry['boundsTree'];
    } catch {
      // Some Draco exports fail BVH build; keep geometry renderable without accelerated picking.
    }
  }
  return geometry;
}
