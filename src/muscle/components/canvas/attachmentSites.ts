import { BufferGeometry, Vector3 } from 'three';
import type { MeshBVH } from 'three-mesh-bvh';

export type AttachmentRole = 'origin' | 'insertion';

export type AttachmentSites = Record<AttachmentRole, Vector3>;

/** Share of muscle vertices, nearest each bone, averaged into one attachment site. */
const SITE_VERTEX_SHARE = 0.03;
const MIN_SITE_VERTICES = 6;

const vertex = new Vector3();
const bonePoint = new Vector3();

function distanceToBone(bone: BufferGeometry, point: Vector3): number {
  const tree = bone.boundsTree as unknown as MeshBVH | undefined;
  if (tree) {
    const hit = tree.closestPointToPoint(point);
    if (hit) return hit.distance;
  }
  const positions = bone.getAttribute('position');
  let best = Infinity;
  for (let i = 0; i < positions.count; i++) {
    bonePoint.fromBufferAttribute(positions, i);
    best = Math.min(best, bonePoint.distanceToSquared(point));
  }
  return Math.sqrt(best);
}

/**
 * Where a muscle meets each of its two bones, on the muscle's own surface.
 *
 * Every vertex is assigned to whichever bone it is closer to; each site is the centroid of
 * the few vertices nearest their bone. The muscle and bones must share one coordinate frame
 * (every Z-Anatomy GLB here does). Returns null when either end has no vertices — a muscle
 * that never comes near one of its bones cannot place that end honestly.
 */
export function computeAttachmentSites(
  muscle: BufferGeometry,
  originBone: BufferGeometry,
  insertionBone: BufferGeometry,
): AttachmentSites | null {
  const positions = muscle.getAttribute('position');
  if (!positions || positions.count === 0) return null;

  const nearOrigin: Array<{ index: number; distance: number }> = [];
  const nearInsertion: Array<{ index: number; distance: number }> = [];
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    const toOrigin = distanceToBone(originBone, vertex);
    const toInsertion = distanceToBone(insertionBone, vertex);
    if (toOrigin < toInsertion) nearOrigin.push({ index: i, distance: toOrigin });
    else if (toInsertion < toOrigin) nearInsertion.push({ index: i, distance: toInsertion });
  }
  if (nearOrigin.length === 0 || nearInsertion.length === 0) return null;

  const keep = Math.max(MIN_SITE_VERTICES, Math.round(positions.count * SITE_VERTEX_SHARE));
  const centroid = (candidates: typeof nearOrigin): Vector3 => {
    const nearest = candidates.sort((a, b) => a.distance - b.distance).slice(0, keep);
    const sum = new Vector3();
    for (const { index } of nearest) sum.add(vertex.fromBufferAttribute(positions, index));
    return sum.divideScalar(nearest.length);
  };

  return { origin: centroid(nearOrigin), insertion: centroid(nearInsertion) };
}
