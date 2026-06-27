import type { BufferAttribute, BufferGeometry } from 'three';
import { Mesh, Raycaster, Vector3 } from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import { isInEarSealBand } from './skinCoverageAudit';

export type EarShellAuditMetrics = {
  /** Open boundary edges in lateral ear band (midline-adjacent seam excluded). */
  lateralOpenBoundaryEdges: number;
  /** Sample points on auricular shell where outward rays miss the mesh within thickness. */
  rayMissCount: number;
  raySampleCount: number;
};

const MIDLINE_SEAM_MAX_ABS_X = 0.028;

function readEdgeMidpoint(
  position: BufferAttribute,
  a: number,
  b: number,
): { x: number; y: number; z: number; maxAbsX: number } {
  const ax = position.getX(a);
  const ay = position.getY(a);
  const az = position.getZ(a);
  const bx = position.getX(b);
  const by = position.getY(b);
  const bz = position.getZ(b);
  return {
    x: (ax + bx) / 2,
    y: (ay + by) / 2,
    z: (az + bz) / 2,
    maxAbsX: Math.max(Math.abs(ax), Math.abs(bx)),
  };
}

function inEarBand(point: { y: number; maxAbsX: number; z: number }): boolean {
  return isInEarSealBand(point);
}

/** Open boundary edges in the auricular band excluding sagittal seam sliver. */
export function countLateralEarOpenBoundaryEdges(geometry: BufferGeometry): number {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  const index = geometry.getIndex();
  if (!position || !index) return 0;

  const edgeCounts = new Map<string, number>();
  const edgeMid = new Map<string, ReturnType<typeof readEdgeMidpoint>>();

  for (let tri = 0; tri < index.count / 3; tri += 1) {
    const i0 = index.getX(tri * 3)!;
    const i1 = index.getX(tri * 3 + 1)!;
    const i2 = index.getX(tri * 3 + 2)!;
    for (const [a, b] of [
      [i0, i1],
      [i0, i2],
      [i1, i2],
    ] as const) {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
      if (!edgeMid.has(key)) {
        edgeMid.set(key, readEdgeMidpoint(position, a, b));
      }
    }
  }

  let count = 0;
  for (const [key, hits] of edgeCounts) {
    if (hits !== 1) continue;
    const mid = edgeMid.get(key)!;
    if (mid.maxAbsX <= MIDLINE_SEAM_MAX_ABS_X) continue;
    if (!inEarBand(mid)) continue;
    count += 1;
  }
  return count;
}

/** Wireframe segments for lateral ear open boundary edges (visible shell gaps, not interior loops). */
export function buildEarOpenBoundaryDebugSegmentPositions(
  geometry: BufferGeometry,
): Float32Array | null {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  const index = geometry.getIndex();
  if (!position || !index) return null;

  const edgeCounts = new Map<string, number>();
  const edges = new Map<string, [number, number]>();

  for (let tri = 0; tri < index.count / 3; tri += 1) {
    const i0 = index.getX(tri * 3)!;
    const i1 = index.getX(tri * 3 + 1)!;
    const i2 = index.getX(tri * 3 + 2)!;
    for (const [a, b] of [
      [i0, i1],
      [i0, i2],
      [i1, i2],
    ] as const) {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
      edges.set(key, [a, b]);
    }
  }

  const verts: number[] = [];
  for (const [key, hits] of edgeCounts) {
    if (hits !== 1) continue;
    const [a, b] = edges.get(key)!;
    const mid = readEdgeMidpoint(position, a, b);
    if (mid.maxAbsX <= MIDLINE_SEAM_MAX_ABS_X) continue;
    if (!inEarBand(mid)) continue;
    verts.push(
      position.getX(a),
      position.getY(a),
      position.getZ(a),
      position.getX(b),
      position.getY(b),
      position.getZ(b),
    );
  }

  if (verts.length === 0) return null;
  return new Float32Array(verts);
}

/**
 * Cast rays from the lateral exterior toward the head — misses mean visible holes
 * (geometry gap or backface-only shell in the viewport).
 */
export function auditEarShellRaycast(
  geometry: BufferGeometry,
  exteriorSign: 1 | -1 = 1,
): Pick<EarShellAuditMetrics, 'rayMissCount' | 'raySampleCount'> {
  const geo = geometry.clone();
  geo.computeVertexNormals();
  if (!geo.boundsTree) {
    geo.boundsTree = new MeshBVH(geo) as BufferGeometry['boundsTree'];
  }

  const mesh = new Mesh(geo);
  mesh.raycast = acceleratedRaycast;

  const raycaster = new Raycaster();
  const origin = new Vector3();
  const direction = new Vector3();

  let rayMissCount = 0;
  let raySampleCount = 0;

  const ySteps = [1.48, 1.52, 1.56, 1.6, 1.64];
  const xSteps = [0.08, 0.1, 0.12];
  const zSteps = [-0.04, 0, 0.04];

  for (const y of ySteps) {
    for (const absX of xSteps) {
      for (const z of zSteps) {
        origin.set(exteriorSign * (absX + 0.06), y, z);
        direction.set(-exteriorSign, 0, 0);
        raycaster.set(origin, direction.normalize());
        const hits = raycaster.intersectObject(mesh, false);
        raySampleCount += 1;
        if (hits.length === 0 || hits[0]!.distance > 0.18) {
          rayMissCount += 1;
        }
      }
    }
  }

  mesh.geometry.dispose();
  return { rayMissCount, raySampleCount };
}

export function exteriorSignForSkinHalf(_half: 'study' | 'reference'): 1 | -1 {
  void _half;
  return 1;
}

export function auditEarShellForHalf(
  geometry: BufferGeometry,
  half: 'study' | 'reference',
): EarShellAuditMetrics {
  const { rayMissCount, raySampleCount } = auditEarShellRaycast(
    geometry,
    exteriorSignForSkinHalf(half),
  );
  return {
    lateralOpenBoundaryEdges: countLateralEarOpenBoundaryEdges(geometry),
    rayMissCount,
    raySampleCount,
  };
}
