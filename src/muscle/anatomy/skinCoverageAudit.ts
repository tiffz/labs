import type { BufferAttribute, BufferGeometry } from 'three';
import { countBoundaryEdges } from './skinMeshTopology';

export type SkinBandContext = {
  x: number;
  y: number;
  z: number;
  maxAbsX: number;
  minX: number;
};

export type SkinCoverageBandSpec = {
  id: string;
  label: string;
  /** Match triangle centroids and boundary-edge midpoints in staging (+X study) space. */
  matches: (ctx: SkinBandContext) => boolean;
};

/** Staging-space bands where skin must exist after runtime align + sagittal clip. */
export const SKIN_COVERAGE_BANDS: SkinCoverageBandSpec[] = [
  {
    id: 'smileLine',
    label: 'Nasolabial / smile line (lateral perioral)',
    matches: (c) =>
      c.y >= 1.38 && c.y <= 1.52 && c.maxAbsX >= 0.02 && c.maxAbsX < 0.12 && c.z > 0.04,
  },
  {
    id: 'eyebrow',
    label: 'Eyebrow / supraorbital',
    matches: (c) => c.y >= 1.62 && c.y <= 1.78 && c.z > 0.03,
  },
  {
    id: 'upperTrapShoulder',
    label: 'Upper trap / shoulder cape (head↔back junction)',
    matches: (c) =>
      c.y >= 1.35 && c.y <= 1.65 && c.maxAbsX > 0.08 && c.maxAbsX < 0.28,
  },
  {
    id: 'pecDeltJunction',
    label: 'Lateral pectoral / deltoid skin',
    matches: (c) =>
      c.y >= 1.05 && c.y <= 1.35 && c.maxAbsX > 0.08 && c.maxAbsX < 0.28 && c.z > -0.05,
  },
  {
    id: 'platysmaFront',
    label: 'Anterior neck / platysma (midline-adjacent)',
    matches: (c) => c.y >= 1.08 && c.y <= 1.3 && c.maxAbsX < 0.09 && c.z > 0.01,
  },
  {
    id: 'lateralNeckScm',
    label: 'Lateral SCM / platysma (not sagittal cut)',
    matches: (c) =>
      c.y >= 1.05 && c.y <= 1.45 && c.maxAbsX > 0.06 && c.maxAbsX < 0.22,
  },
  {
    id: 'anteriorNeck',
    label: 'Anterior neck band',
    matches: (c) => c.y >= 1.05 && c.y <= 1.38 && c.maxAbsX < 0.12,
  },
  {
    id: 'palmWrist',
    label: 'Palmar / wrist skin (lateral hand)',
    matches: (c) =>
      c.y >= 0.82 && c.y <= 1.02 && c.maxAbsX > 0.08 && c.maxAbsX < 0.36,
  },
  {
    id: 'earLateral',
    label: 'Lateral auricular / helix skin',
    matches: (c) =>
      c.y >= 1.45 && c.y <= 1.65 && c.maxAbsX > 0.06 && c.maxAbsX < 0.15,
  },
];

export type SkinCoverageBandMetrics = {
  id: string;
  label: string;
  triangleCount: number;
  boundaryEdgeCount: number;
  interiorLoopCount: number;
  largestInteriorLoopEdges: number;
};

export type BoundaryLoop = {
  edgeCount: number;
  centroid: { x: number; y: number; z: number };
  maxAbsX: number;
  minAbsX: number;
  /** Closed loop vertex indices in boundary order. */
  vertexIndices: number[];
  /** Boundary edges as vertex-index pairs (for debug wireframe). */
  boundaryEdges: Array<[number, number]>;
};

function readVertex(position: BufferAttribute, index: number): SkinBandContext {
  const x = position.getX(index);
  return {
    x,
    y: position.getY(index),
    z: position.getZ(index),
    maxAbsX: Math.abs(x),
    minX: x,
  };
}

function ctxFromPoints(points: SkinBandContext[]): SkinBandContext {
  const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  const z = points.reduce((sum, p) => sum + p.z, 0) / points.length;
  const maxAbsX = Math.max(...points.map((p) => p.maxAbsX));
  const minX = Math.min(...points.map((p) => p.minX));
  return { x, y, z, maxAbsX, minX };
}

/** Boundary edges (single-adjacent triangles) grouped into closed loops. */
export function findBoundaryLoops(geometry: BufferGeometry): BoundaryLoop[] {
  const position = geometry.getAttribute('position') as BufferAttribute;
  const index = geometry.getIndex();
  if (!index) return [];

  const edgeCounts = new Map<string, { a: number; b: number; count: number }>();
  for (let tri = 0; tri < index.count / 3; tri += 1) {
    const corners = [0, 1, 2].map((c) => index.getX(tri * 3 + c)!);
    for (let e = 0; e < 3; e += 1) {
      const a = corners[e]!;
      const b = corners[(e + 1) % 3]!;
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const entry = edgeCounts.get(key);
      if (entry) entry.count += 1;
      else edgeCounts.set(key, { a, b, count: 1 });
    }
  }

  const boundaryEdges: Array<[number, number]> = [];
  for (const entry of edgeCounts.values()) {
    if (entry.count === 1) boundaryEdges.push([entry.a, entry.b]);
  }

  const adjacency = new Map<number, number[]>();
  for (const [a, b] of boundaryEdges) {
    adjacency.set(a, [...(adjacency.get(a) ?? []), b]);
    adjacency.set(b, [...(adjacency.get(b) ?? []), a]);
  }

  const visited = new Set<string>();
  const loops: BoundaryLoop[] = [];

  for (const [start, next] of boundaryEdges) {
    const key = start < next ? `${start}:${next}` : `${next}:${start}`;
    if (visited.has(key)) continue;

    const loopVerts: number[] = [start];
    const loopEdges: Array<[number, number]> = [[start, next]];
    let prev = start;
    let curr = next;
    visited.add(key);

    while (curr !== start && loopVerts.length <= boundaryEdges.length + 2) {
      loopVerts.push(curr);
      const neighbors = adjacency.get(curr) ?? [];
      const candidates = neighbors.filter((n) => {
        if (n === prev) return false;
        const edgeKey = curr < n ? `${curr}:${n}` : `${n}:${curr}`;
        return !visited.has(edgeKey);
      });
      if (candidates.length === 0) break;
      const nxt = candidates[0]!;
      const edgeKey = curr < nxt ? `${curr}:${nxt}` : `${nxt}:${curr}`;
      visited.add(edgeKey);
      loopEdges.push([curr, nxt]);
      prev = curr;
      curr = nxt;
    }

    if (curr !== start || loopVerts.length < 3) continue;
    const points = loopVerts.map((vi) => readVertex(position, vi));
    const centroid = ctxFromPoints(points);
    loops.push({
      edgeCount: loopEdges.length,
      centroid: { x: centroid.x, y: centroid.y, z: centroid.z },
      maxAbsX: centroid.maxAbsX,
      minAbsX: Math.min(...points.map((p) => Math.abs(p.x))),
      vertexIndices: loopVerts,
      boundaryEdges: loopEdges,
    });
  }

  return loops;
}

/** Loops fully away from the sagittal clip plane — likely visible skin holes, not the cut edge. */
export function isInteriorSkinHoleLoop(loop: BoundaryLoop): boolean {
  return loop.minAbsX > 0.035 && loop.edgeCount >= 4 && loop.edgeCount <= 180;
}

/** Max vertex–vertex distance across a loop (staging units ≈ meters). */
export function loopDiameter(position: BufferAttribute, loop: BoundaryLoop): number {
  const indices = loop.vertexIndices;
  let maxDist = 0;
  for (let i = 0; i < indices.length; i += 1) {
    for (let j = i + 1; j < indices.length; j += 1) {
      const ax = position.getX(indices[i]!);
      const ay = position.getY(indices[i]!);
      const az = position.getZ(indices[i]!);
      const bx = position.getX(indices[j]!);
      const by = position.getY(indices[j]!);
      const bz = position.getZ(indices[j]!);
      const dist = Math.hypot(ax - bx, ay - by, az - bz);
      if (dist > maxDist) maxDist = dist;
    }
  }
  return maxDist;
}

export type SkinHoleLoopFilter = {
  minEdgeCount?: number;
  minDiameter?: number;
  bounds?: {
    minY: number;
    maxY: number;
    minAbsX: number;
    maxAbsX: number;
    minZ?: number;
  };
};

export const SHOULDER_DELT_DEBUG_BOUNDS = {
  minY: 1.1,
  maxY: 1.44,
  minAbsX: 0.07,
  maxAbsX: 0.26,
  minZ: -0.1,
};

/** Palmar band — relaxed thresholds for debug overlay only (both halves). */
export const PALM_WRIST_DEBUG_BOUNDS = {
  minY: 0.82,
  maxY: 1.02,
  minAbsX: 0.08,
  maxAbsX: 0.36,
  minZ: -0.12,
};

/** Anterior palmar center (mid-palm void — sparse tris, rarely the thenar/hypothenar gaps). */
export const PALMAR_CENTER_COVERAGE_BOUNDS = {
  minY: 0.86,
  maxY: 0.95,
  minAbsX: 0.16,
  maxAbsX: 0.28,
  minZ: 0.03,
  maxZ: 0.12,
};

/** Thenar eminence pad — visible void often aligns here (Palm ↔ eminence patch junction). */
export const THENAR_EMINENCE_COVERAGE_BOUNDS = {
  minY: 0.84,
  maxY: 0.92,
  minAbsX: 0.22,
  maxAbsX: 0.32,
  minZ: 0.02,
  maxZ: 0.12,
};

/** Hypothenar eminence pad — often a coverage gap (few tris, no interior loop). */
export const HYPOTHENAR_EMINENCE_COVERAGE_BOUNDS = {
  minY: 0.84,
  maxY: 0.92,
  minAbsX: 0.14,
  maxAbsX: 0.22,
  minZ: 0.02,
  maxZ: 0.12,
};

/** Minimum triangles for continuous anterior palmar shell (matches half-split palmar floor). */
export const PALMAR_CENTER_COVERAGE_TRI_FLOOR = 80;

export const THENAR_EMINENCE_COVERAGE_TRI_FLOOR = 35;

export const HYPOTHENAR_EMINENCE_COVERAGE_TRI_FLOOR = 25;

/** Auricular band — relaxed debug for pinna pinholes (4+ edges). */
export const EAR_LATERAL_DEBUG_BOUNDS = {
  minY: 1.45,
  maxY: 1.66,
  minAbsX: 0.05,
  maxAbsX: 0.15,
  minZ: -0.1,
  maxZ: 0.09,
};

/** Medial attachment through helix — runtime seal + orange debug overlay band. */
export const EAR_SEAL_SKIP_ABS_X = 0.01;
export const EAR_SEAL_MAX_ABS_X = 0.15;

/** Lateral upper-arm glTF primitive seams (deltoid / biceps junction). */
export const LATERAL_UPPER_ARM_SEAL_BOUNDS = {
  minY: 1.15,
  maxY: 1.45,
  minAbsX: 0.1,
  maxAbsX: 0.2,
  minZ: -0.06,
  maxZ: 0.06,
};

/** Lateral forearm + wrist glTF primitive seams. */
export const LATERAL_FOREARM_SEAL_BOUNDS = {
  minY: 0.93,
  maxY: 1.12,
  minAbsX: 0.12,
  maxAbsX: 0.3,
  minZ: -0.04,
  maxZ: 0.08,
};

/** Dorsal thenar / thumb CMC glTF island seams (medial x, posterior z). */
export const MEDIAL_THUMB_CMC_SEAL_BOUNDS = {
  minY: 0.86,
  maxY: 0.98,
  minAbsX: 0.025,
  maxAbsX: 0.07,
  minZ: -0.12,
  maxZ: 0.06,
};

/** Lateral palm + dorsal hand glTF island seams. */
export const LATERAL_PALM_SEAL_BOUNDS = {
  minY: 0.82,
  maxY: 1.05,
  minAbsX: 0.18,
  maxAbsX: 0.32,
  minZ: -0.02,
  maxZ: 0.08,
};

/** Medial auricular attachment to scalp (class I seam) — not the sagittal cut at x≈0. */
export const MEDIAL_EAR_ATTACHMENT_SEAL_BOUNDS = {
  minY: 1.45,
  maxY: 1.66,
  minAbsX: 0.0025,
  maxAbsX: 0.035,
  minZ: -0.12,
  maxZ: 0.12,
};

export function isInEarSealBand(point: {
  y: number;
  maxAbsX: number;
  z: number;
}): boolean {
  return (
    point.y >= EAR_LATERAL_DEBUG_BOUNDS.minY &&
    point.y <= EAR_LATERAL_DEBUG_BOUNDS.maxY &&
    point.maxAbsX > EAR_SEAL_SKIP_ABS_X &&
    point.maxAbsX <= EAR_SEAL_MAX_ABS_X &&
    point.z >= (EAR_LATERAL_DEBUG_BOUNDS.minZ ?? -Infinity) &&
    point.z <= (EAR_LATERAL_DEBUG_BOUNDS.maxZ ?? Infinity)
  );
}

export function isInLateralUpperArmSealBand(point: {
  y: number;
  maxAbsX: number;
  z: number;
}): boolean {
  return (
    point.y >= LATERAL_UPPER_ARM_SEAL_BOUNDS.minY &&
    point.y <= LATERAL_UPPER_ARM_SEAL_BOUNDS.maxY &&
    point.maxAbsX >= LATERAL_UPPER_ARM_SEAL_BOUNDS.minAbsX &&
    point.maxAbsX <= LATERAL_UPPER_ARM_SEAL_BOUNDS.maxAbsX &&
    point.z >= LATERAL_UPPER_ARM_SEAL_BOUNDS.minZ &&
    point.z <= LATERAL_UPPER_ARM_SEAL_BOUNDS.maxZ
  );
}

export function isInLateralForearmSealBand(point: {
  y: number;
  maxAbsX: number;
  z: number;
}): boolean {
  return (
    point.y >= LATERAL_FOREARM_SEAL_BOUNDS.minY &&
    point.y <= LATERAL_FOREARM_SEAL_BOUNDS.maxY &&
    point.maxAbsX >= LATERAL_FOREARM_SEAL_BOUNDS.minAbsX &&
    point.maxAbsX <= LATERAL_FOREARM_SEAL_BOUNDS.maxAbsX &&
    point.z >= LATERAL_FOREARM_SEAL_BOUNDS.minZ &&
    point.z <= LATERAL_FOREARM_SEAL_BOUNDS.maxZ
  );
}

export function isInMedialThumbCmcSealBand(point: {
  y: number;
  maxAbsX: number;
  z: number;
}): boolean {
  return (
    point.y >= MEDIAL_THUMB_CMC_SEAL_BOUNDS.minY &&
    point.y <= MEDIAL_THUMB_CMC_SEAL_BOUNDS.maxY &&
    point.maxAbsX >= MEDIAL_THUMB_CMC_SEAL_BOUNDS.minAbsX &&
    point.maxAbsX <= MEDIAL_THUMB_CMC_SEAL_BOUNDS.maxAbsX &&
    point.z >= MEDIAL_THUMB_CMC_SEAL_BOUNDS.minZ &&
    point.z <= MEDIAL_THUMB_CMC_SEAL_BOUNDS.maxZ
  );
}

export function isInLateralPalmSealBand(point: {
  y: number;
  maxAbsX: number;
  z: number;
}): boolean {
  return (
    point.y >= LATERAL_PALM_SEAL_BOUNDS.minY &&
    point.y <= LATERAL_PALM_SEAL_BOUNDS.maxY &&
    point.maxAbsX >= LATERAL_PALM_SEAL_BOUNDS.minAbsX &&
    point.maxAbsX <= LATERAL_PALM_SEAL_BOUNDS.maxAbsX &&
    point.z >= LATERAL_PALM_SEAL_BOUNDS.minZ &&
    point.z <= LATERAL_PALM_SEAL_BOUNDS.maxZ
  );
}

export function isInMedialEarAttachmentSealBand(point: {
  y: number;
  maxAbsX: number;
  z: number;
}): boolean {
  return (
    point.y >= MEDIAL_EAR_ATTACHMENT_SEAL_BOUNDS.minY &&
    point.y <= MEDIAL_EAR_ATTACHMENT_SEAL_BOUNDS.maxY &&
    point.maxAbsX >= MEDIAL_EAR_ATTACHMENT_SEAL_BOUNDS.minAbsX &&
    point.maxAbsX <= MEDIAL_EAR_ATTACHMENT_SEAL_BOUNDS.maxAbsX &&
    point.z >= MEDIAL_EAR_ATTACHMENT_SEAL_BOUNDS.minZ &&
    point.z <= MEDIAL_EAR_ATTACHMENT_SEAL_BOUNDS.maxZ
  );
}

/** True when an open glTF slit edge is eligible for runtime quad bridge (excludes sagittal cut at x≈0). */
export function shouldSealGlTfSlitEdge(
  position: BufferAttribute,
  a: number,
  b: number,
): boolean {
  const ax = position.getX(a);
  const bx = position.getX(b);
  const my = (position.getY(a) + position.getY(b)) / 2;
  const mz = (position.getZ(a) + position.getZ(b)) / 2;
  const maxAbsX = Math.max(Math.abs(ax), Math.abs(bx));
  const mid = { y: my, maxAbsX, z: mz };

  if (
    isInEarSealBand(mid) ||
    isInLateralUpperArmSealBand(mid) ||
    isInLateralForearmSealBand(mid) ||
    isInMedialThumbCmcSealBand(mid) ||
    isInLateralPalmSealBand(mid)
  ) {
    return true;
  }

  if (Math.abs(ax) < 0.001 && Math.abs(bx) < 0.001) return false;
  return isInMedialEarAttachmentSealBand(mid);
}

/** glTF island slits bridged at runtime via quad stitch (ear + limb + palm bands). */
export function isInGlTfSlitSealBand(point: {
  y: number;
  maxAbsX: number;
  z: number;
}): boolean {
  return (
    isInEarSealBand(point) ||
    isInLateralUpperArmSealBand(point) ||
    isInLateralForearmSealBand(point) ||
    isInMedialThumbCmcSealBand(point) ||
    isInLateralPalmSealBand(point) ||
    isInMedialEarAttachmentSealBand(point)
  );
}

function loopDedupKey(loop: BoundaryLoop): string {
  return loop.vertexIndices.join(':');
}

/** Relaxed palmar loops for ?skinHoles=1 (8+ edges in palmWrist band). */
export function isPalmarStudyDebugHoleLoop(
  loop: BoundaryLoop,
  position: BufferAttribute,
): boolean {
  if (!isInteriorSkinHoleLoop(loop)) return false;
  if (loop.edgeCount < 8 || loop.edgeCount > 32) return false;
  if (loopDiameter(position, loop) < 0.008) return false;
  return loopInBounds(loop, PALM_WRIST_DEBUG_BOUNDS);
}

/** Thenar / hypothenar pad loops and micro-seams (4+ edges) — matches visible palm void placement. */
export function isPalmarEminenceDebugHoleLoop(
  loop: BoundaryLoop,
  position: BufferAttribute,
): boolean {
  if (!isInteriorSkinHoleLoop(loop)) return false;
  if (loop.edgeCount < 4 || loop.edgeCount > 24) return false;
  if (loopDiameter(position, loop) < 0.006) return false;
  return (
    loopInBounds(loop, THENAR_EMINENCE_COVERAGE_BOUNDS) ||
    loopInBounds(loop, HYPOTHENAR_EMINENCE_COVERAGE_BOUNDS)
  );
}

/** Auricular pinholes for ?skinHoles=1 (4+ edges in earLateral band). */
export function isEarLateralDebugHoleLoop(
  loop: BoundaryLoop,
  position: BufferAttribute,
): boolean {
  if (!isInteriorSkinHoleLoop(loop)) return false;
  if (loop.edgeCount < 4 || loop.edgeCount > 64) return false;
  if (loopDiameter(position, loop) < 0.004) return false;
  return loopInBounds(loop, EAR_LATERAL_DEBUG_BOUNDS);
}

/** Line-segment pairs for interior hole loops (debug overlay). */
export function buildInteriorHoleLoopSegmentPositions(
  geometry: BufferGeometry,
  filter: SkinHoleLoopFilter = {},
): Float32Array | null {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  if (!position) return null;

  const loops = findBoundaryLoops(geometry).filter((loop) =>
    isSignificantVisibleSkinHoleLoop(loop, position, filter),
  );

  const verts: number[] = [];
  for (const loop of loops) {
    for (const [a, b] of loop.boundaryEdges) {
      verts.push(
        position.getX(a),
        position.getY(a),
        position.getZ(a),
        position.getX(b),
        position.getY(b),
        position.getZ(b),
      );
    }
  }

  if (verts.length === 0) return null;
  return new Float32Array(verts);
}

/**
 * Debug overlay segments for one sagittal half — render on the matching AnatomyHalfGroup
 * (study geometry → study half; reference geometry → reference half). Do not mirror.
 */
export function buildSkinHoleDebugSegmentPositions(
  geometry: BufferGeometry,
  options?: {
    includePalmarRelaxed?: boolean;
    includePalmarEminence?: boolean;
    includeEarRelaxed?: boolean;
  },
): Float32Array | null {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  if (!position) return null;

  const defaultFilter: SkinHoleLoopFilter = { minEdgeCount: 14, minDiameter: 0.012 };
  const seen = new Set<string>();
  const included: BoundaryLoop[] = [];

  for (const loop of findBoundaryLoops(geometry)) {
    if (isSignificantVisibleSkinHoleLoop(loop, position, defaultFilter)) {
      const key = loopDedupKey(loop);
      if (!seen.has(key)) {
        seen.add(key);
        included.push(loop);
      }
    }
  }

  if (options?.includePalmarRelaxed !== false) {
    for (const loop of findBoundaryLoops(geometry)) {
      if (!isPalmarStudyDebugHoleLoop(loop, position)) continue;
      const key = loopDedupKey(loop);
      if (seen.has(key)) continue;
      seen.add(key);
      included.push(loop);
    }
  }

  if (options?.includePalmarEminence !== false) {
    for (const loop of findBoundaryLoops(geometry)) {
      if (!isPalmarEminenceDebugHoleLoop(loop, position)) continue;
      const key = loopDedupKey(loop);
      if (seen.has(key)) continue;
      seen.add(key);
      included.push(loop);
    }
  }

  if (options?.includeEarRelaxed !== false) {
    for (const loop of findBoundaryLoops(geometry)) {
      if (!isEarLateralDebugHoleLoop(loop, position)) continue;
      const key = loopDedupKey(loop);
      if (seen.has(key)) continue;
      seen.add(key);
      included.push(loop);
    }
  }

  const verts: number[] = [];
  for (const loop of included) {
    for (const [a, b] of loop.boundaryEdges) {
      verts.push(
        position.getX(a),
        position.getY(a),
        position.getZ(a),
        position.getX(b),
        position.getY(b),
        position.getZ(b),
      );
    }
  }

  if (verts.length === 0) return null;
  return new Float32Array(verts);
}

export type SkinBandBounds = {
  minY: number;
  maxY: number;
  minAbsX: number;
  maxAbsX: number;
  minZ?: number;
  maxZ?: number;
};

/** Count triangles whose centroid falls in a staging-space band (+X study coords). */
export function countTrianglesInBand(
  geometry: BufferGeometry,
  bounds: SkinBandBounds,
): number {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  const index = geometry.getIndex();
  if (!position || !index) return 0;

  let count = 0;
  for (let tri = 0; tri < index.count / 3; tri += 1) {
    const verts = [0, 1, 2].map((corner) => {
      const vi = index.getX(tri * 3 + corner)!;
      return readVertex(position, vi);
    });
    const centroid = ctxFromPoints(verts);
    if (triangleInBand(centroid, bounds)) count += 1;
  }
  return count;
}

function triangleInBand(ctx: SkinBandContext, bounds: SkinBandBounds): boolean {
  if (ctx.y < bounds.minY || ctx.y > bounds.maxY) return false;
  if (ctx.maxAbsX < bounds.minAbsX || ctx.maxAbsX > bounds.maxAbsX) return false;
  if (bounds.minZ !== undefined && ctx.z < bounds.minZ) return false;
  if (bounds.maxZ !== undefined && ctx.z > bounds.maxZ) return false;
  return true;
}

/** Largest interior palmar loop by edge count (topology anchor — often wrist-adjacent, not void center). */
export function findPrimaryPalmarInteriorLoop(geometry: BufferGeometry): BoundaryLoop | null {
  const loops = findBoundaryLoops(geometry).filter(isInteriorSkinHoleLoop);
  let best: BoundaryLoop | null = null;
  for (const loop of loops) {
    if (!loopInBounds(loop, PALM_WRIST_DEBUG_BOUNDS)) continue;
    if (!best || loop.edgeCount > best.edgeCount) best = loop;
  }
  return best;
}

function pushLineSegment(
  verts: number[],
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
): void {
  verts.push(ax, ay, az, bx, by, bz);
}

function pushAxisAlignedBoxWireframe(verts: number[], bounds: SkinBandBounds): void {
  const x0 = bounds.minAbsX;
  const x1 = bounds.maxAbsX;
  const y0 = bounds.minY;
  const y1 = bounds.maxY;
  const z0 = bounds.minZ ?? -0.12;
  const z1 = bounds.maxZ ?? 0.12;

  pushLineSegment(verts, x0, y0, z0, x1, y0, z0);
  pushLineSegment(verts, x1, y0, z0, x1, y1, z0);
  pushLineSegment(verts, x1, y1, z0, x0, y1, z0);
  pushLineSegment(verts, x0, y1, z0, x0, y0, z0);
  pushLineSegment(verts, x0, y0, z1, x1, y0, z1);
  pushLineSegment(verts, x1, y0, z1, x1, y1, z1);
  pushLineSegment(verts, x1, y1, z1, x0, y1, z1);
  pushLineSegment(verts, x0, y1, z1, x0, y0, z1);
  pushLineSegment(verts, x0, y0, z0, x0, y0, z1);
  pushLineSegment(verts, x1, y0, z0, x1, y0, z1);
  pushLineSegment(verts, x1, y1, z0, x1, y1, z1);
  pushLineSegment(verts, x0, y1, z0, x0, y1, z1);
}

function pushCentroidCrosshair(
  verts: number[],
  x: number,
  y: number,
  z: number,
  arm = 0.018,
): void {
  pushLineSegment(verts, x - arm, y, z, x + arm, y, z);
  pushLineSegment(verts, x, y - arm, z, x, y + arm, z);
  pushLineSegment(verts, x, y, z - arm, x, y, z + arm);
}

/**
 * Cyan palmar eminence diagnostic — wireframe boxes on thenar / hypothenar pad staging bands.
 * Always drawn in ?skinHoles=1 so void placement aligns with eminence anatomy (not mid-palm).
 */
export function buildPalmarEminenceDiagnosticSegmentPositions(
  geometry: BufferGeometry,
): Float32Array | null {
  void geometry;
  const verts: number[] = [];
  const eminenceBounds = [
    THENAR_EMINENCE_COVERAGE_BOUNDS,
    HYPOTHENAR_EMINENCE_COVERAGE_BOUNDS,
  ];

  for (const bounds of eminenceBounds) {
    pushAxisAlignedBoxWireframe(verts, bounds);
    const cx = (bounds.minAbsX + bounds.maxAbsX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const cz = ((bounds.minZ ?? 0) + (bounds.maxZ ?? 0)) / 2;
    pushCentroidCrosshair(verts, cx, cy, cz);
  }

  if (verts.length === 0) return null;
  return new Float32Array(verts);
}

/** @deprecated Use buildPalmarEminenceDiagnosticSegmentPositions — kept for tests migrating off center box. */
export function buildPalmarVoidDiagnosticSegmentPositions(
  geometry: BufferGeometry,
): Float32Array | null {
  return buildPalmarEminenceDiagnosticSegmentPositions(geometry);
}

/** Filters micro-seams (4–12 edges) that rarely read as visible holes in the viewport. */
export function isSignificantVisibleSkinHoleLoop(
  loop: BoundaryLoop,
  position: BufferAttribute,
  filter: SkinHoleLoopFilter = {},
): boolean {
  if (isMidlineThroatHoleLoop(loop) || isBackTrapDotHoleLoop(loop)) return true;
  if (!isInteriorSkinHoleLoop(loop)) return false;

  const minEdgeCount = filter.minEdgeCount ?? 14;
  const minDiameter = filter.minDiameter ?? 0.022;
  if (loop.edgeCount < minEdgeCount) return false;
  if (loopDiameter(position, loop) < minDiameter) return false;

  const bounds = filter.bounds;
  if (bounds && !loopInBounds(loop, bounds)) return false;

  return true;
}

/** Closed midline loop in the anterior throat — excluded by minAbsX > 0.035 interior filter. */
export function isMidlineThroatHoleLoop(loop: BoundaryLoop): boolean {
  return (
    loop.maxAbsX < 0.075 &&
    loop.centroid.y >= 1.12 &&
    loop.centroid.y <= 1.48 &&
    loop.centroid.z > -0.03 &&
    loop.edgeCount >= 8 &&
    loop.edgeCount <= 55
  );
}

export function findMidlineThroatHoleLoops(geometry: BufferGeometry): BoundaryLoop[] {
  return findBoundaryLoops(geometry).filter(isMidlineThroatHoleLoop);
}

/** Small posterior trap / scapular skin dots. */
export function isBackTrapDotHoleLoop(loop: BoundaryLoop): boolean {
  return (
    loop.maxAbsX > 0.055 &&
    loop.maxAbsX < 0.26 &&
    loop.centroid.y >= 1.28 &&
    loop.centroid.y <= 1.62 &&
    loop.centroid.z < -0.03 &&
    loop.edgeCount >= 4 &&
    loop.edgeCount <= 16
  );
}

function loopInBounds(
  loop: BoundaryLoop,
  bounds: SkinBandBounds,
): boolean {
  const absX = Math.abs(loop.centroid.x);
  if (loop.centroid.y < bounds.minY || loop.centroid.y > bounds.maxY) return false;
  if (absX < bounds.minAbsX || absX > bounds.maxAbsX) return false;
  if (bounds.minZ !== undefined && loop.centroid.z < bounds.minZ) return false;
  if (bounds.maxZ !== undefined && loop.centroid.z > bounds.maxZ) return false;
  return true;
}

function bandForContext(ctx: SkinBandContext, bands = SKIN_COVERAGE_BANDS): string | null {
  for (const band of bands) {
    if (band.matches(ctx)) return band.id;
  }
  return null;
}

export function auditSkinCoverageBands(
  geometry: BufferGeometry,
  bands: SkinCoverageBandSpec[] = SKIN_COVERAGE_BANDS,
): SkinCoverageBandMetrics[] {
  const position = geometry.getAttribute('position') as BufferAttribute;
  const index = geometry.getIndex()!;
  const metrics = new Map<
    string,
    SkinCoverageBandMetrics & { loops: BoundaryLoop[] }
  >(
    bands.map((band) => [
      band.id,
      {
        id: band.id,
        label: band.label,
        triangleCount: 0,
        boundaryEdgeCount: 0,
        interiorLoopCount: 0,
        largestInteriorLoopEdges: 0,
        loops: [],
      },
    ]),
  );

  for (let tri = 0; tri < index.count / 3; tri += 1) {
    const verts = [0, 1, 2].map((corner) => {
      const vi = index.getX(tri * 3 + corner)!;
      return readVertex(position, vi);
    });
    const centroid = ctxFromPoints(verts);
    const bandId = bandForContext(centroid, bands);
    if (bandId) metrics.get(bandId)!.triangleCount += 1;
  }

  const edgeCounts = new Map<string, number>();
  for (let tri = 0; tri < index.count / 3; tri += 1) {
    const corners = [0, 1, 2].map((c) => index.getX(tri * 3 + c)!);
    for (let e = 0; e < 3; e += 1) {
      const a = corners[e]!;
      const b = corners[(e + 1) % 3]!;
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
  }

  for (const [key, count] of edgeCounts) {
    if (count !== 1) continue;
    const [aStr, bStr] = key.split(':');
    const a = Number(aStr);
    const b = Number(bStr);
    const midpoint = ctxFromPoints([readVertex(position, a), readVertex(position, b)]);
    const bandId = bandForContext(midpoint, bands);
    if (bandId) metrics.get(bandId)!.boundaryEdgeCount += 1;
  }

  for (const loop of findBoundaryLoops(geometry)) {
    if (!isInteriorSkinHoleLoop(loop)) continue;
    const bandId = bandForContext(
      {
        x: loop.centroid.x,
        y: loop.centroid.y,
        z: loop.centroid.z,
        maxAbsX: loop.maxAbsX,
        minX: loop.centroid.x,
      },
      bands,
    );
    if (!bandId) continue;
    const row = metrics.get(bandId)!;
    row.interiorLoopCount += 1;
    row.largestInteriorLoopEdges = Math.max(row.largestInteriorLoopEdges, loop.edgeCount);
  }

  return bands.map((band) => {
    const row = metrics.get(band.id)!;
    return {
      id: row.id,
      label: row.label,
      triangleCount: row.triangleCount,
      boundaryEdgeCount: row.boundaryEdgeCount,
      interiorLoopCount: row.interiorLoopCount,
      largestInteriorLoopEdges: row.largestInteriorLoopEdges,
    };
  });
}

export function totalSkinBoundaryEdges(geometry: BufferGeometry): number {
  const index = geometry.getIndex();
  if (!index) return 0;
  return countBoundaryEdges(new Uint32Array(index.array));
}

export function formatSkinCoverageAudit(rows: SkinCoverageBandMetrics[]): string {
  return rows
    .map(
      (row) =>
        `- ${row.id}: ${row.triangleCount} tris, ${row.boundaryEdgeCount} seam edges, ${row.interiorLoopCount} interior loops (max ${row.largestInteriorLoopEdges} edges) — ${row.label}`,
    )
    .join('\n');
}

/** User-reported platysma / lateral neck / trap–delt hole band (staging +X study space). */
export const PLATYSMA_HOTSPOT_BOUNDS = {
  minY: 1.05,
  maxY: 1.55,
  minAbsX: 0.04,
  maxAbsX: 0.28,
};

export type PlatysmaHotspotMetrics = {
  interiorLoopCount: number;
  largestInteriorLoopEdges: number;
};

export function auditPlatysmaHotspotHoles(
  geometry: BufferGeometry,
): PlatysmaHotspotMetrics {
  const loops = findBoundaryLoops(geometry)
    .filter(isInteriorSkinHoleLoop)
    .filter((loop) => loopInBounds(loop, PLATYSMA_HOTSPOT_BOUNDS));

  return {
    interiorLoopCount: loops.length,
    largestInteriorLoopEdges: loops.reduce((max, loop) => Math.max(max, loop.edgeCount), 0),
  };
}

/** |x| below this at a boundary-edge midpoint counts as sagittal seam-adjacent (not interior-hole filter). */
export const MIDLINE_SEAM_EDGE_MAX_ABS_X = 0.028;

/** Vertical span where seam gaps are user-visible (excludes feet). */
export const MIDLINE_SEAM_Y_RANGE = { minY: 0.15, maxY: 1.55 } as const;

export function isMidlineSeamAdjacentContext(ctx: SkinBandContext): boolean {
  return (
    ctx.maxAbsX <= MIDLINE_SEAM_EDGE_MAX_ABS_X &&
    ctx.y >= MIDLINE_SEAM_Y_RANGE.minY &&
    ctx.y <= MIDLINE_SEAM_Y_RANGE.maxY
  );
}

/** Closed loop straddling the sagittal plane — excluded by isInteriorSkinHoleLoop (minAbsX > 0.035). */
export function isMidlineSeamInteriorLoop(loop: BoundaryLoop): boolean {
  if (isMidlineThroatHoleLoop(loop)) return false;
  return (
    loop.maxAbsX <= MIDLINE_SEAM_EDGE_MAX_ABS_X &&
    loop.centroid.y >= MIDLINE_SEAM_Y_RANGE.minY &&
    loop.centroid.y <= MIDLINE_SEAM_Y_RANGE.maxY &&
    loop.edgeCount >= 4 &&
    loop.edgeCount <= 80
  );
}

function collectBoundaryEdgeMidpoints(geometry: BufferGeometry): Array<{ a: number; b: number; ctx: SkinBandContext }> {
  const position = geometry.getAttribute('position') as BufferAttribute;
  const index = geometry.getIndex();
  if (!index) return [];

  const edgeCounts = new Map<string, { a: number; b: number; count: number }>();
  for (let tri = 0; tri < index.count / 3; tri += 1) {
    const corners = [0, 1, 2].map((c) => index.getX(tri * 3 + c)!);
    for (let e = 0; e < 3; e += 1) {
      const a = corners[e]!;
      const b = corners[(e + 1) % 3]!;
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const existing = edgeCounts.get(key);
      if (existing) existing.count += 1;
      else edgeCounts.set(key, { a, b, count: 1 });
    }
  }

  const edges: Array<{ a: number; b: number; ctx: SkinBandContext }> = [];
  for (const { a, b, count } of edgeCounts.values()) {
    if (count !== 1) continue;
    const midpoint = ctxFromPoints([readVertex(position, a), readVertex(position, b)]);
    edges.push({ a, b, ctx: midpoint });
  }
  return edges;
}

/** Open boundary edges on the sagittal cut — seam pinholes the interior-hole filter misses. */
export function countMidlineSeamBoundaryEdges(geometry: BufferGeometry): number {
  return collectBoundaryEdgeMidpoints(geometry).filter(({ ctx }) => isMidlineSeamAdjacentContext(ctx)).length;
}

export function countMidlineSeamInteriorLoops(geometry: BufferGeometry): number {
  return findBoundaryLoops(geometry).filter(isMidlineSeamInteriorLoop).length;
}

export type MidlineSeamGapMetrics = {
  seamBoundaryEdgeCount: number;
  seamInteriorLoopCount: number;
};

export function auditMidlineSeamGaps(geometry: BufferGeometry): MidlineSeamGapMetrics {
  return {
    seamBoundaryEdgeCount: countMidlineSeamBoundaryEdges(geometry),
    seamInteriorLoopCount: countMidlineSeamInteriorLoops(geometry),
  };
}

/** Yellow debug wireframe — sagittal-adjacent open boundary edges (seam gaps). */
export function buildMidlineSeamGapSegmentPositions(geometry: BufferGeometry): Float32Array | null {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  if (!position) return null;

  const verts: number[] = [];
  for (const { a, b, ctx } of collectBoundaryEdgeMidpoints(geometry)) {
    if (!isMidlineSeamAdjacentContext(ctx)) continue;
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
