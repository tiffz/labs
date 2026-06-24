import type { BufferAttribute, BufferGeometry } from 'three';

export type SkinSagittalClipOptions = {
  /** Minimum +X for triangle centroid (local study-side half before parent mirror). */
  minCentroidX?: number;
  /** Keep triangles when any vertex reaches the study half — reduces bicep/neck border gaps. */
  anyVertexOnHalf?: boolean;
  /** Keep midline pelvis/groin geometry whole on the study half (avoids half-penis clip). */
  preserveMidlinePelvis?: boolean;
  /** Keep suprasternal / clavicular skin at the sagittal midline (avoids neck pit hole). */
  preserveMidlineThorax?: boolean;
  /** Keep midline facial skin whole (avoids vertical nose/lip seam gaps). */
  preserveMidlineFace?: boolean;
  /** Keep anterior neck / platysma junction skin whole at the sagittal midline. */
  preserveMidlineAnteriorNeck?: boolean;
};

const DEFAULT_OPTIONS: Required<SkinSagittalClipOptions> = {
  minCentroidX: 0,
  anyVertexOnHalf: true,
  preserveMidlinePelvis: true,
  preserveMidlineThorax: true,
  preserveMidlineFace: true,
  preserveMidlineAnteriorNeck: true,
};

/** Staging-space pelvis band — triangles here stay intact when preserveMidlinePelvis is on. */
function isMidlinePelvisTriangle(
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
): boolean {
  const maxAbsX = Math.max(Math.abs(a[0]), Math.abs(b[0]), Math.abs(c[0]));
  const cy = (a[1] + b[1] + c[1]) / 3;
  return maxAbsX < 0.028 && cy >= 0.78 && cy <= 1.08;
}

/** Staging-space clavicle / suprasternal notch / upper trap — keep whole when sagittal clip opens a pit. */
function isMidlineThoraxTriangle(
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
): boolean {
  const maxAbsX = Math.max(Math.abs(a[0]), Math.abs(b[0]), Math.abs(c[0]));
  const cy = (a[1] + b[1] + c[1]) / 3;
  return maxAbsX < 0.06 && cy >= 1.15 && cy <= 1.72;
}

/** Staging-space midline face — nose, philtrum, chin seam. */
function isMidlineFaceTriangle(
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
): boolean {
  const maxAbsX = Math.max(Math.abs(a[0]), Math.abs(b[0]), Math.abs(c[0]));
  const cy = (a[1] + b[1] + c[1]) / 3;
  return maxAbsX < 0.07 && cy >= 1.28 && cy <= 1.78;
}

/** Staging-space anterior neck / platysma — submental to suprasternal junction. */
function isMidlineAnteriorNeckTriangle(
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
): boolean {
  const maxAbsX = Math.max(Math.abs(a[0]), Math.abs(b[0]), Math.abs(c[0]));
  const cy = (a[1] + b[1] + c[1]) / 3;
  return maxAbsX < 0.08 && cy >= 1.02 && cy <= 1.42;
}

function triangleOnLocalStudyHalf(
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
  minCentroidX: number,
  anyVertexOnHalf: boolean,
): boolean {
  if (anyVertexOnHalf) {
    const maxX = Math.max(a[0], b[0], c[0]);
    if (maxX >= minCentroidX) return true;
  }
  const cx = (a[0] + b[0] + c[0]) / 3;
  return cx >= minCentroidX;
}

/**
 * Keep the +X local half used for both study (+scale) and reference (−scale mirror) skin.
 * Reference parent mirror maps this local +X shell onto world −X so anatomy stays on world +X.
 */
export function clipSkinGeometryToStudyHalf(
  geometry: BufferGeometry,
  minCentroidX = 0,
  options?: SkinSagittalClipOptions,
): BufferGeometry {
  const opts = { ...DEFAULT_OPTIONS, ...options, minCentroidX };
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

    if (opts.preserveMidlinePelvis && isMidlinePelvisTriangle(a, b, c)) {
      kept.push(i0, i1, i2);
      continue;
    }

    if (opts.preserveMidlineThorax && isMidlineThoraxTriangle(a, b, c)) {
      kept.push(i0, i1, i2);
      continue;
    }

    if (opts.preserveMidlineFace && isMidlineFaceTriangle(a, b, c)) {
      kept.push(i0, i1, i2);
      continue;
    }

    if (opts.preserveMidlineAnteriorNeck && isMidlineAnteriorNeckTriangle(a, b, c)) {
      kept.push(i0, i1, i2);
      continue;
    }

    if (triangleOnLocalStudyHalf(a, b, c, opts.minCentroidX, opts.anyVertexOnHalf)) {
      kept.push(i0, i1, i2);
    }
  }

  if (kept.length === 0) return geometry;

  const clipped = geometry.clone();
  clipped.setIndex(kept);
  clipped.computeVertexNormals();
  return clipped;
}
