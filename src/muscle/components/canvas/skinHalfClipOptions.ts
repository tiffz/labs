import type { BufferAttribute, BufferGeometry } from 'three';
import {
  clipSkinGeometryToStudyHalf,
  stripSkinTrianglesOnNegativeX,
  type SkinSagittalClipOptions,
} from './clipSkinToStudyHalf';

/** Study (+scale): keep midline caps so the transparent shell has no sagittal pinholes. */
export const STUDY_SKIN_CLIP_OPTIONS: SkinSagittalClipOptions = {
  anyVertexOnHalf: true,
  preserveMidlinePelvis: true,
  preserveMidlineThorax: true,
  preserveMidlineFace: true,
  preserveMidlineAnteriorNeck: true,
  preserveMidlineAbdomen: true,
  preserveMidlinePosteriorNeck: true,
  preserveLateralEar: true,
};

/**
 * Reference (−scale mirror): strict +X shell with midline face/neck caps, then strip other −X bleed.
 * Midline face caps straddle x=0 — kept through strip so the opaque shell is closed; other −X tris drop.
 */
export const REFERENCE_SKIN_CLIP_OPTIONS: SkinSagittalClipOptions = {
  anyVertexOnHalf: false,
  preserveMidlinePelvis: false,
  preserveMidlineThorax: false,
  preserveMidlineFace: true,
  preserveMidlineAnteriorNeck: true,
  preserveMidlineAbdomen: false,
  preserveMidlinePosteriorNeck: false,
  preserveLateralEar: true,
  minVertexX: 0,
};

export function clipSkinGeometryForStudyHalf(geometry: BufferGeometry): BufferGeometry {
  return clipSkinGeometryToStudyHalf(geometry.clone(), 0, STUDY_SKIN_CLIP_OPTIONS);
}

/**
 * Reference (−scale mirror): strict +X local shell, then strip −X bleed before parent mirror.
 */
export function clipSkinGeometryForReferenceHalf(geometry: BufferGeometry): BufferGeometry {
  const clipped = clipSkinGeometryToStudyHalf(geometry.clone(), 0, REFERENCE_SKIN_CLIP_OPTIONS);
  return stripSkinTrianglesOnNegativeX(clipped);
}

/** Triangles whose local minX < 0 would mirror onto world +X after reference parent mirror. */
export function countReferenceMirrorBleedTriangles(geometry: BufferGeometry): number {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  const index = geometry.getIndex();
  if (!position || position.count === 0) return 0;

  const triangleCount = index ? index.count / 3 : position.count / 3;
  let bleed = 0;

  for (let tri = 0; tri < triangleCount; tri += 1) {
    const i0 = index ? index.getX(tri * 3)! : tri * 3;
    const i1 = index ? index.getX(tri * 3 + 1)! : tri * 3 + 1;
    const i2 = index ? index.getX(tri * 3 + 2)! : tri * 3 + 2;
    const minX = Math.min(position.getX(i0), position.getX(i1), position.getX(i2));
    if (minX < -0.0005) bleed += 1;
  }

  return bleed;
}
