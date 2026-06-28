import { BufferAttribute, BufferGeometry, Float32BufferAttribute } from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SKIN_GLB_PRIMITIVE_WELD_EPSILON } from '../components/canvas/mergeSkinEnvelopeGeometry';
import {
  EAR_LATERAL_DEBUG_BOUNDS,
  findBoundaryLoops,
  isInEarSealBand,
  isInGlTfSlitSealBand,
  isInteriorSkinHoleLoop,
  loopInBounds,
  shouldSealGlTfSlitEdge,
  type BoundaryLoop,
} from './skinCoverageAudit';
import { assignBufferGeometryIndex } from '../components/canvas/skinGeometryIndex';

type OpenSlitEdge = { a: number; b: number; key: string };

const SLIT_BRIDGE_MAX_MIDPOINT_DIST = 0.055;
const SLIT_BRIDGE_MAX_ENDPOINT_DIST = 0.042;
const SLIT_BRIDGE_MIN_PARALLEL_DOT = 0.45;
const SLIT_SPATIAL_WELD_EPSILON = 0.006;
const MAX_BRIDGE_PASSES = 4;

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

function findRemapRoot(remap: Int32Array, index: number): number {
  let root = index;
  while (remap[root] !== root) {
    root = remap[root]!;
  }
  return root;
}

function unionRemap(remap: Int32Array, a: number, b: number): void {
  const rootA = findRemapRoot(remap, a);
  const rootB = findRemapRoot(remap, b);
  if (rootA === rootB) return;
  if (rootA < rootB) remap[rootB] = rootA;
  else remap[rootA] = rootB;
}

function applyVertexRemap(geometry: BufferGeometry, remap: Int32Array): BufferGeometry {
  const index = geometry.getIndex();
  if (!index) return geometry;
  const indices: number[] = [];
  for (let i = 0; i < index.count; i += 1) {
    indices.push(findRemapRoot(remap, index.getX(i)!));
  }
  const remapped = geometry.clone();
  assignBufferGeometryIndex(remapped, indices);
  return remapped;
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
  return outward ? [a, b, d, a, d, c] : [a, c, d, a, d, c];
}

function buildMidpointGridKey(mid: [number, number, number], cell: number): string {
  return [
    Math.floor(mid[0] / cell),
    Math.floor(mid[1] / cell),
    Math.floor(mid[2] / cell),
  ].join(':');
}

function findBridgePartner(
  position: BufferAttribute,
  edge: OpenSlitEdge,
  grid: Map<string, OpenSlitEdge[]>,
  used: Set<string>,
): OpenSlitEdge | null {
  const mid1 = edgeMidpoint(position, edge.a, edge.b);
  const cell = SLIT_BRIDGE_MAX_MIDPOINT_DIST;
  let best: OpenSlitEdge | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  const cx = Math.floor(mid1[0] / cell);
  const cy = Math.floor(mid1[1] / cell);
  const cz = Math.floor(mid1[2] / cell);
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        const bucket = grid.get(`${cx + dx}:${cy + dy}:${cz + dz}`);
        if (!bucket) continue;
        for (const candidate of bucket) {
          if (candidate.key === edge.key || used.has(candidate.key)) continue;
          if (!edgesAreParallel(position, edge, candidate)) continue;
          if (!endpointPairing(position, edge, candidate)) continue;
          const mid2 = edgeMidpoint(position, candidate.a, candidate.b);
          const dist = Math.hypot(mid2[0] - mid1[0], mid2[1] - mid1[1], mid2[2] - mid1[2]);
          if (dist > SLIT_BRIDGE_MAX_MIDPOINT_DIST || dist >= bestDist) continue;
          bestDist = dist;
          best = candidate;
        }
      }
    }
  }

  return best;
}

function bridgeGlTfSlitPairs(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  const index = geometry.getIndex();
  if (!position || !index) return geometry;

  const open = collectOpenSlitEdges(position, index);
  if (open.length === 0) return geometry;

  const grid = new Map<string, OpenSlitEdge[]>();
  for (const edge of open) {
    const key = buildMidpointGridKey(edgeMidpoint(position, edge.a, edge.b), SLIT_BRIDGE_MAX_MIDPOINT_DIST);
    const bucket = grid.get(key) ?? [];
    bucket.push(edge);
    grid.set(key, bucket);
  }

  const used = new Set<string>();
  const bridgeTris: number[] = [];

  for (const edge of open) {
    if (used.has(edge.key)) continue;
    const partner = findBridgePartner(position, edge, grid, used);
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
  assignBufferGeometryIndex(bridged, indices);
  const welded = mergeVertices(bridged, SKIN_GLB_PRIMITIVE_WELD_EPSILON);
  welded.computeVertexNormals();
  return welded;
}

/** Merge slit-band verts within export-style distance — closes unpaired primitive gaps. */
function spatialWeldRemainingSlitVerts(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  const index = geometry.getIndex();
  if (!position || !index) return geometry;

  const open = collectOpenSlitEdges(position, index);
  if (open.length === 0) return geometry;

  const slitVerts = new Set<number>();
  for (const edge of open) {
    slitVerts.add(edge.a);
    slitVerts.add(edge.b);
  }

  const remap = new Int32Array(position.count);
  for (let i = 0; i < remap.length; i += 1) {
    remap[i] = i;
  }

  const verts = [...slitVerts];
  for (let i = 0; i < verts.length; i += 1) {
    for (let j = i + 1; j < verts.length; j += 1) {
      const a = verts[i]!;
      const b = verts[j]!;
      const mid = {
        y: (position.getY(a) + position.getY(b)) / 2,
        maxAbsX: Math.max(Math.abs(position.getX(a)), Math.abs(position.getX(b))),
        z: (position.getZ(a) + position.getZ(b)) / 2,
      };
      if (!isInGlTfSlitSealBand(mid)) continue;
      if (vertexDistance(position, a, b) <= SLIT_SPATIAL_WELD_EPSILON) {
        unionRemap(remap, a, b);
      }
    }
  }

  let mergedAny = false;
  for (let i = 0; i < remap.length; i += 1) {
    if (findRemapRoot(remap, i) !== i) mergedAny = true;
  }
  if (!mergedAny) return geometry;

  const remapped = applyVertexRemap(geometry, remap);
  const welded = mergeVertices(remapped, SKIN_GLB_PRIMITIVE_WELD_EPSILON);
  welded.computeVertexNormals();
  return welded;
}

function loopInEarShellBand(loop: BoundaryLoop): boolean {
  return loopInBounds(loop, EAR_LATERAL_DEBUG_BOUNDS);
}

/** Fan-fill tiny auricular interior loops only (never face shell). */
function fillEarMicroInteriorLoops(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  const index = geometry.getIndex();
  if (!position || !index) return geometry;

  const loops = findBoundaryLoops(geometry).filter(
    (loop) =>
      isInteriorSkinHoleLoop(loop) &&
      loop.edgeCount >= 4 &&
      loop.edgeCount <= 10 &&
      loopInEarShellBand(loop) &&
      isInEarSealBand({ y: loop.centroid.y, maxAbsX: loop.maxAbsX, z: loop.centroid.z }),
  );
  if (loops.length === 0) return geometry;

  const positions: number[] = [];
  for (let i = 0; i < position.count; i += 1) {
    positions.push(position.getX(i), position.getY(i), position.getZ(i));
  }
  const indices: number[] = [];
  for (let i = 0; i < index.count; i += 1) {
    indices.push(index.getX(i)!);
  }

  for (const loop of loops) {
    const verts = loop.vertexIndices;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (const vi of verts) {
      cx += position.getX(vi);
      cy += position.getY(vi);
      cz += position.getZ(vi);
    }
    cx /= verts.length;
    cy /= verts.length;
    cz /= verts.length;
    const hub = positions.length / 3;
    positions.push(cx, cy, cz);
    for (let i = 0; i < verts.length; i += 1) {
      indices.push(hub, verts[i]!, verts[(i + 1) % verts.length]!);
    }
  }

  const filled = geometry.clone();
  filled.setAttribute('position', new Float32BufferAttribute(positions, 3));
  assignBufferGeometryIndex(filled, indices);
  filled.computeVertexNormals();
  return filled;
}

/** Bridge + spatial weld glTF primitive seams in ear + limb bands (no mirror back-fill). */
export function sealEarLateralBoundaryCracks(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  if (!position) return geometry;

  let current = geometry.clone();
  for (let pass = 0; pass < MAX_BRIDGE_PASSES; pass += 1) {
    const bridged = bridgeGlTfSlitPairs(current);
    const welded = spatialWeldRemainingSlitVerts(bridged);
    if (welded.index!.count === current.index!.count) break;
    current = welded;
  }

  return fillEarMicroInteriorLoops(current);
}
