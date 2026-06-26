import type { BufferAttribute, BufferGeometry } from 'three';
import {
  clipSkinGeometryToStudyHalf,
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
};

/**
 * Reference (−scale mirror): strict +X local shell only — no midline preserve bands.
 * Triangles with local minX < 0 mirror onto world +X and read as opaque patches on the study side.
 */
export const REFERENCE_SKIN_CLIP_OPTIONS: SkinSagittalClipOptions = {
  anyVertexOnHalf: false,
  preserveMidlinePelvis: false,
  preserveMidlineThorax: false,
  preserveMidlineFace: false,
  preserveMidlineAnteriorNeck: false,
  preserveMidlineAbdomen: false,
  preserveMidlinePosteriorNeck: false,
  preserveLateralEar: true,
  minVertexX: 0,
};

export function clipSkinGeometryForStudyHalf(geometry: BufferGeometry): BufferGeometry {
  return clipSkinGeometryToStudyHalf(geometry.clone(), 0, STUDY_SKIN_CLIP_OPTIONS);
}

export function clipSkinGeometryForReferenceHalf(geometry: BufferGeometry): BufferGeometry {
  return clipSkinGeometryToStudyHalf(geometry.clone(), 0, REFERENCE_SKIN_CLIP_OPTIONS);
}

/** Triangles whose local minX < 0 would appear on world +X after reference parent mirror. */
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
