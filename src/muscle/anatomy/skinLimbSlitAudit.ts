import type { BufferAttribute, BufferGeometry } from 'three';
import {
  isInEarSealBand,
  isInGlTfSlitSealBand,
  isInLateralForearmSealBand,
  isInLateralPalmSealBand,
  isInLateralUpperArmSealBand,
  isInMedialEarAttachmentSealBand,
  isInMedialThumbCmcSealBand,
} from './skinCoverageAudit';

type OpenSlitEdgeMidpoint = { y: number; maxAbsX: number; z: number };
type OpenSlitEdgeRecord = OpenSlitEdgeMidpoint & { a: number; b: number };

function readOpenSlitEdges(geometry: BufferGeometry): OpenSlitEdgeRecord[] {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  const index = geometry.getIndex();
  if (!position || !index) return [];

  const edgeCounts = new Map<string, number>();
  const edgeData = new Map<string, OpenSlitEdgeRecord>();

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
      if (!edgeData.has(key)) {
        const ax = position.getX(a);
        const ay = position.getY(a);
        const az = position.getZ(a);
        const bx = position.getX(b);
        const by = position.getY(b);
        const bz = position.getZ(b);
        edgeData.set(key, {
          a,
          b,
          y: (ay + by) / 2,
          maxAbsX: Math.max(Math.abs(ax), Math.abs(bx)),
          z: (az + bz) / 2,
        });
      }
    }
  }

  const open: OpenSlitEdgeRecord[] = [];
  for (const [key, hits] of edgeCounts) {
    if (hits !== 1) continue;
    open.push(edgeData.get(key)!);
  }
  return open;
}

function readOpenSlitEdgeMidpoints(geometry: BufferGeometry): OpenSlitEdgeMidpoint[] {
  return readOpenSlitEdges(geometry);
}

/** Lime debug wireframe — open glTF primitive slits in ear + limb seal bands (not interior loops). */
export function buildGlTfSlitOpenBoundaryDebugSegmentPositions(
  geometry: BufferGeometry,
): Float32Array | null {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  if (!position) return null;

  const verts: number[] = [];
  for (const edge of readOpenSlitEdges(geometry)) {
    if (!isInGlTfSlitSealBand(edge)) continue;
    verts.push(
      position.getX(edge.a),
      position.getY(edge.a),
      position.getZ(edge.a),
      position.getX(edge.b),
      position.getY(edge.b),
      position.getZ(edge.b),
    );
  }

  if (verts.length === 0) return null;
  return new Float32Array(verts);
}

export function countGlTfSlitOpenBoundaryEdges(geometry: BufferGeometry): number {
  return readOpenSlitEdgeMidpoints(geometry).filter((mid) => isInGlTfSlitSealBand(mid)).length;
}

export function countLateralEarSlitOpenBoundaryEdges(geometry: BufferGeometry): number {
  return readOpenSlitEdgeMidpoints(geometry).filter((mid) => isInEarSealBand(mid)).length;
}

export function countLateralUpperArmSlitOpenBoundaryEdges(geometry: BufferGeometry): number {
  return readOpenSlitEdgeMidpoints(geometry).filter((mid) => isInLateralUpperArmSealBand(mid)).length;
}

export function countLateralForearmSlitOpenBoundaryEdges(geometry: BufferGeometry): number {
  return readOpenSlitEdgeMidpoints(geometry).filter((mid) => isInLateralForearmSealBand(mid)).length;
}

export function countMedialThumbCmcSlitOpenBoundaryEdges(geometry: BufferGeometry): number {
  return readOpenSlitEdgeMidpoints(geometry).filter((mid) => isInMedialThumbCmcSealBand(mid)).length;
}

export function countLateralPalmSlitOpenBoundaryEdges(geometry: BufferGeometry): number {
  return readOpenSlitEdgeMidpoints(geometry).filter((mid) => isInLateralPalmSealBand(mid)).length;
}

export function countMedialEarAttachmentSlitOpenBoundaryEdges(geometry: BufferGeometry): number {
  return readOpenSlitEdgeMidpoints(geometry).filter((mid) => isInMedialEarAttachmentSealBand(mid)).length;
}
