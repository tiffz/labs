import { BufferAttribute, BufferGeometry } from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SKIN_GLB_PRIMITIVE_WELD_EPSILON } from '../components/canvas/mergeSkinEnvelopeGeometry';
import { shouldSealGlTfSlitEdge } from './skinCoverageAudit';

type OpenSlitEdge = { a: number; b: number; key: string };

const SLIT_BRIDGE_MAX_MIDPOINT_DIST = 0.055;
const SLIT_BRIDGE_MAX_ENDPOINT_DIST = 0.042;
const SLIT_BRIDGE_MIN_PARALLEL_DOT = 0.45;

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function edgeVector(position: BufferAttribute, a: number, b: number): [number, number, number] {
  return [
    position.getX(b) - position.getX(a),
    position.getY(b) - position.getY(a),
    position.getZ(b) - position.getZ(a),
  ];
}

function edgeMidpoint(position: BufferAttribute, a: number, b: number): [number, number, number] {
  return [
    (position.getX(a) + position.getX(b)) / 2,
    (position.getY(a) + position.getY(b)) / 2,
    (position.getZ(a) + position.getZ(b)) / 2,
  ];
}

function vectorLength(v: [number, number, number]): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function normalize(v: [number, number, number]): [number, number, number] {
  const len = vectorLength(v);
  if (len < 1e-8) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function vertexDistance(position: BufferAttribute, a: number, b: number): number {
  return Math.hypot(
    position.getX(a) - position.getX(b),
    position.getY(a) - position.getY(b),
    position.getZ(a) - position.getZ(b),
  );
}

function collectOpenSlitEdges(
  position: BufferAttribute,
  index: NonNullable<BufferGeometry['index']>,
): OpenSlitEdge[] {
  const edgeCounts = new Map<string, number>();
  const edgeVerts = new Map<string, OpenSlitEdge>();

  for (let tri = 0; tri < index.count / 3; tri += 1) {
    const verts = [index.getX(tri * 3)!, index.getX(tri * 3 + 1)!, index.getX(tri * 3 + 2)!];
    for (let e = 0; e < 3; e += 1) {
      const a = verts[e]!;
      const b = verts[(e + 1) % 3]!;
      const key = edgeKey(a, b);
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
      if (!edgeVerts.has(key)) edgeVerts.set(key, { a, b, key });
    }
  }

  const open: OpenSlitEdge[] = [];
  for (const [key, hits] of edgeCounts) {
    if (hits !== 1) continue;
    const edge = edgeVerts.get(key)!;
    if (!shouldSealGlTfSlitEdge(position, edge.a, edge.b)) continue;
    open.push(edge);
  }
  return open;
}

function edgesAreParallel(position: BufferAttribute, e1: OpenSlitEdge, e2: OpenSlitEdge): boolean {
  const v1 = normalize(edgeVector(position, e1.a, e1.b));
  const v2 = normalize(edgeVector(position, e2.a, e2.b));
  if (vectorLength(v1) < 1e-6 || vectorLength(v2) < 1e-6) return false;
  return Math.abs(dot(v1, v2)) >= SLIT_BRIDGE_MIN_PARALLEL_DOT;
}

function endpointPairing(
  position: BufferAttribute,
  e1: OpenSlitEdge,
  e2: OpenSlitEdge,
): [number, number, number, number] | null {
  const options: Array<[number, number, number, number]> = [
    [e1.a, e1.b, e2.a, e2.b],
    [e1.a, e1.b, e2.b, e2.a],
  ];
  let best: [number, number, number, number] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const option of options) {
    const [a, b, c, d] = option;
    const score = vertexDistance(position, a, c) + vertexDistance(position, b, d);
    if (score < bestScore) {
      bestScore = score;
      best = option;
    }
  }
  if (!best) return null;
  const [a, b, c, d] = best;
  if (vertexDistance(position, a, c) > SLIT_BRIDGE_MAX_ENDPOINT_DIST) return null;
  if (vertexDistance(position, b, d) > SLIT_BRIDGE_MAX_ENDPOINT_DIST) return null;
  return best;
}

function bridgeWinding(
  position: BufferAttribute,
  a: number,
  b: number,
  c: number,
  d: number,
): [number, number, number, number, number, number] {
  const ax = position.getX(a);
  const ay = position.getY(a);
  const az = position.getZ(a);
  const bx = position.getX(b);
  const by = position.getY(b);
  const bz = position.getZ(b);
  const cx = position.getX(c);
  const cy = position.getY(c);
  const cz = position.getZ(c);

  const e1x = bx - ax;
  const e1y = by - ay;
  const e1z = bz - az;
  const e2x = cx - ax;
  const e2y = cy - ay;
  const e2z = cz - az;
  const nx = e1y * e2z - e1z * e2y;
  const ny = e1z * e2x - e1x * e2z;
  const nz = e1x * e2y - e1y * e2x;
  const outward = nx * ax + ny * ay + nz * az >= 0;
  return outward ? [a, b, d, a, d, c] : [a, c, d, a, d, b];
}

function findBridgePartner(
  position: BufferAttribute,
  edge: OpenSlitEdge,
  candidates: OpenSlitEdge[],
  used: Set<string>,
): OpenSlitEdge | null {
  const mid1 = edgeMidpoint(position, edge.a, edge.b);
  let best: OpenSlitEdge | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (candidate.key === edge.key || used.has(candidate.key)) continue;
    if (!edgesAreParallel(position, edge, candidate)) continue;
    if (!endpointPairing(position, edge, candidate)) continue;
    const mid2 = edgeMidpoint(position, candidate.a, candidate.b);
    const dist = Math.hypot(mid2[0] - mid1[0], mid2[1] - mid1[1], mid2[2] - mid1[2]);
    if (dist > SLIT_BRIDGE_MAX_MIDPOINT_DIST || dist >= bestDist) continue;
    bestDist = dist;
    best = candidate;
  }

  return best;
}

/**
 * Bridge paired glTF primitive slits with a quad — avoids mirror back-fill, which added
 * hundreds of coplanar duplicate tris that read as slit holes on transparent study skin.
 */
function bridgeGlTfSlitPairs(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  const index = geometry.getIndex();
  if (!position || !index) return geometry;

  const open = collectOpenSlitEdges(position, index);
  if (open.length === 0) return geometry;

  const used = new Set<string>();
  const bridgeTris: number[] = [];

  for (const edge of open) {
    if (used.has(edge.key)) continue;
    const partner = findBridgePartner(position, edge, open, used);
    if (!partner) continue;

    const pairing = endpointPairing(position, edge, partner);
    if (!pairing) continue;

    used.add(edge.key);
    used.add(partner.key);
    bridgeTris.push(...bridgeWinding(position, ...pairing));
  }

  if (bridgeTris.length === 0) return geometry;

  const indices: number[] = [];
  for (let i = 0; i < index.count; i += 1) {
    indices.push(index.getX(i)!);
  }
  indices.push(...bridgeTris);

  const bridged = geometry.clone();
  bridged.setIndex(indices);
  const welded = mergeVertices(bridged, SKIN_GLB_PRIMITIVE_WELD_EPSILON);
  welded.computeVertexNormals();
  return welded;
}

/** Bridge glTF primitive seam pairs in ear + limb bands (no mirror back-fill). */
export function sealEarLateralBoundaryCracks(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  if (!position) return geometry;

  let current = geometry.clone();
  for (let pass = 0; pass < 8; pass += 1) {
    const next = bridgeGlTfSlitPairs(current);
    if (next.index!.count === current.index!.count) break;
    current = next;
  }
  return current;
}
