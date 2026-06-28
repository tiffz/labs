import type { BufferAttribute, BufferGeometry } from 'three';

/** Reverse triangle winding so outward normals stay correct after an X mirror. */
function flipGeometryWinding(geometry: BufferGeometry): void {
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
 * Mirror −X Z-Anatomy exports onto +X with the sagittal plane at local x=0, so study (+scale)
 * shows a cross-section rather than the sagittal edge.
 *
 * Do not translate a straddling mesh by −min.x — that pins the edge at x=0 but moves the
 * anatomical midline to +X, exploding the staged group into columns.
 */
export function alignAnatomyMeshToStudyHalf(geometry: BufferGeometry): BufferGeometry {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box || box.isEmpty() || box.min.x >= 0) return geometry;

  const aligned = geometry.clone();
  aligned.scale(-1, 1, 1);
  flipGeometryWinding(aligned);
  aligned.computeVertexNormals();
  return aligned;
}
