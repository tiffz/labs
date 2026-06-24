import type { BufferGeometry } from 'three';

/**
 * Z-Anatomy unified skin weld often lands bulk on −X while curriculum staging pins .r anatomy on +X.
 * Mirror X when the envelope mass sits on the negative side so sagittal clip keeps the study half.
 */
export function alignSkinEnvelopeToStudyHalf(geometry: BufferGeometry): BufferGeometry {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box || box.isEmpty()) return geometry;

  if (box.max.x > Math.abs(box.min.x)) {
    return geometry;
  }

  const aligned = geometry.clone();
  aligned.scale(-1, 1, 1);
  aligned.computeVertexNormals();
  return aligned;
}
