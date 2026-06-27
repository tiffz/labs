import type { BufferGeometry } from 'three';

export function countSkinGeometryTriangles(geometry: BufferGeometry | null | undefined): number {
  if (!geometry) return 0;
  const index = geometry.getIndex();
  const position = geometry.getAttribute('position');
  if (!position || position.count === 0) return 0;
  if (index) return Math.floor(index.count / 3);
  return Math.floor(position.count / 3);
}

export function countSkinGeometryVertices(geometry: BufferGeometry | null | undefined): number {
  return geometry?.getAttribute('position')?.count ?? 0;
}

export type SkinRenderAuditMetrics = {
  envelopePartCount: number;
  weldedTriangleCount: number;
  weldedVertexCount: number;
  studyClippedTriangleCount: number;
  referenceClippedTriangleCount: number;
  weldedReady: boolean;
  weldError: string | null;
};

export function buildSkinRenderAuditMetrics(
  partCount: number,
  welded: BufferGeometry | null,
  studyClipped: BufferGeometry | null,
  referenceClipped: BufferGeometry | null,
  weldError: string | null = null,
): SkinRenderAuditMetrics {
  const weldedTriangleCount = countSkinGeometryTriangles(welded);
  return {
    envelopePartCount: partCount,
    weldedTriangleCount,
    weldedVertexCount: countSkinGeometryVertices(welded),
    studyClippedTriangleCount: countSkinGeometryTriangles(studyClipped),
    referenceClippedTriangleCount: countSkinGeometryTriangles(referenceClipped),
    weldedReady: welded !== null && weldedTriangleCount > 0,
    weldError,
  };
}
