import type { BufferAttribute, BufferGeometry } from 'three';

/**
 * Keep only triangles whose centroid lies on the +X study half (Z-Anatomy .r export side).
 * Removes midline-crossing pelvis/groin fragments that bleed onto the transparent half.
 */
export function clipSkinGeometryToStudyHalf(
  geometry: BufferGeometry,
  minCentroidX = 0.004,
): BufferGeometry {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  if (!position || position.count === 0) return geometry;

  const srcIndex = geometry.getIndex();
  const triangleCount = srcIndex ? srcIndex.count / 3 : position.count / 3;
  const kept: number[] = [];

  const readVertex = (vertexIndex: number, target: [number, number, number]): void => {
    target[0] = position.getX(vertexIndex);
    target[1] = position.getY(vertexIndex);
    target[2] = position.getZ(vertexIndex);
  };

  const a: [number, number, number] = [0, 0, 0];
  const b: [number, number, number] = [0, 0, 0];
  const c: [number, number, number] = [0, 0, 0];

  for (let tri = 0; tri < triangleCount; tri += 1) {
    const i0 = srcIndex ? srcIndex.getX(tri * 3)! : tri * 3;
    const i1 = srcIndex ? srcIndex.getX(tri * 3 + 1)! : tri * 3 + 1;
    const i2 = srcIndex ? srcIndex.getX(tri * 3 + 2)! : tri * 3 + 2;
    readVertex(i0, a);
    readVertex(i1, b);
    readVertex(i2, c);
    const cx = (a[0] + b[0] + c[0]) / 3;
    if (cx >= minCentroidX) {
      kept.push(i0, i1, i2);
    }
  }

  if (kept.length === 0) return geometry;

  const clipped = geometry.clone();
  clipped.setIndex(kept);
  clipped.computeVertexNormals();
  return clipped;
}
