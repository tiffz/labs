import type { BufferAttribute, BufferGeometry } from 'three';

/** Reverse triangle winding so outward normals stay correct after an X mirror. */
export function flipGeometryWinding(geometry: BufferGeometry): void {
  const index = geometry.getIndex();
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const b = index.getX(i + 1);
      const c = index.getX(i + 2);
      index.setX(i + 1, c);
      index.setX(i + 2, b);
    }
    return;
  }

  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  if (!position) return;
  if (position.count % 3 !== 0) return;
  for (let i = 0; i < position.count; i += 3) {
    const x1 = position.getX(i + 1);
    const y1 = position.getY(i + 1);
    const z1 = position.getZ(i + 1);
    const x2 = position.getX(i + 2);
    const y2 = position.getY(i + 2);
    const z2 = position.getZ(i + 2);
    position.setXYZ(i + 1, x2, y2, z2);
    position.setXYZ(i + 2, x1, y1, z1);
  }
}

/**
 * Mirror −X Z-Anatomy exports onto +X with the sagittal plane at local x=0.
 * Used for both anatomy meshes and the unified skin envelope before study-half clip.
 *
 * Do not translate straddling skin by −min.x — that pins the mesh edge at x=0 but moves
 * the anatomical midline to +X, while anatomy stays at x=0 and staging explodes into columns.
 */
export function alignSkinEnvelopeToStudyHalf(geometry: BufferGeometry): BufferGeometry {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box || box.isEmpty() || box.min.x >= 0) return geometry;

  const aligned = geometry.clone();
  aligned.scale(-1, 1, 1);
  flipGeometryWinding(aligned);
  aligned.computeVertexNormals();
  return aligned;
}

/** Same X mirror as skin — anatomy and skin must share local sagittal x=0 before staging. */
export function alignAnatomyMeshToStudyHalf(geometry: BufferGeometry): BufferGeometry {
  return alignSkinEnvelopeToStudyHalf(geometry);
}

/**
 * Bake reference-half skin onto −X local so it renders with +scale (no parent −X mirror).
 * Outward normals face −X; FrontSide is correct from the frontal camera.
 */
export function mirrorClippedSkinToReferenceHalf(geometry: BufferGeometry): BufferGeometry {
  const mirrored = geometry.clone();
  mirrored.scale(-1, 1, 1);
  flipGeometryWinding(mirrored);
  mirrored.computeVertexNormals();
  return mirrored;
}
