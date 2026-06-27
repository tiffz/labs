import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { alignSkinEnvelopeToStudyHalf, flipGeometryWinding, mirrorClippedSkinToReferenceHalf } from './alignSkinEnvelopeGeometry';
import { clipSkinGeometryToStudyHalf } from './clipSkinToStudyHalf';

function triangleCount(geometry: BufferGeometry): number {
  const index = geometry.getIndex();
  return index ? index.count / 3 : geometry.getAttribute('position').count / 3;
}

function outwardNormalDot(geometry: BufferGeometry, point: Vector3): number {
  const position = geometry.getAttribute('position') as Float32BufferAttribute;
  const normal = geometry.getAttribute('normal') as Float32BufferAttribute;
  let bestDist = Infinity;
  let bestDot = 0;
  for (let i = 0; i < position.count; i += 1) {
    const vx = position.getX(i);
    const vy = position.getY(i);
    const vz = position.getZ(i);
    const dist = (vx - point.x) ** 2 + (vy - point.y) ** 2 + (vz - point.z) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestDot = normal.getX(i) * (vx - point.x) + normal.getY(i) * (vy - point.y) + normal.getZ(i) * (vz - point.z);
    }
  }
  return bestDot;
}

describe('alignSkinEnvelopeToStudyHalf', () => {
  it('mirrors −X-heavy envelopes to +X before study-half clip', () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute(
        new Float32Array([
          -0.2, 0, 0, -0.15, 1, 0, -0.1, 1, 0, -0.2, 0, 0, -0.1, 1, 0, -0.15, 0, 0,
        ]),
        3,
      ),
    );

    const aligned = alignSkinEnvelopeToStudyHalf(geometry);
    aligned.computeBoundingBox();
    expect(aligned.boundingBox!.max.x).toBeGreaterThan(0);

    const clipped = clipSkinGeometryToStudyHalf(aligned, 0);
    expect(triangleCount(clipped)).toBe(2);
  });

  it('does not mirror +X-only envelopes', () => {
    const geometry = new BoxGeometry(0.2, 0.4, 0.1);
    geometry.translate(0.15, 0.2, 0);
    const aligned = alignSkinEnvelopeToStudyHalf(geometry);
    aligned.computeBoundingBox();
    expect(aligned.boundingBox!.min.x).toBeGreaterThan(0);
  });

  it('mirrors straddling −X-heavy skin so sagittal midline stays at local x≈0', () => {
    const geometry = new BoxGeometry(0.34, 0.2, 0.1);
    geometry.translate(-0.12, 1.4, 0);

    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.min.x).toBeLessThan(0);
    expect(geometry.boundingBox!.max.x).toBeGreaterThan(0);

    const aligned = alignSkinEnvelopeToStudyHalf(geometry.clone());
    aligned.computeBoundingBox();
    expect(Math.abs(aligned.boundingBox!.min.x)).toBeLessThan(0.12);
    expect(Math.abs(aligned.boundingBox!.max.x)).toBeLessThan(0.35);
  });

  it('keeps outward-facing normals on −X muscle exports after mirror', () => {
    const geometry = new BoxGeometry(0.08, 0.24, 0.06);
    geometry.translate(-0.18, 1.23, -0.06);

    const aligned = alignSkinEnvelopeToStudyHalf(geometry.clone());
    aligned.computeBoundingBox();
    const center = aligned.boundingBox!.getCenter(new Vector3());
    expect(outwardNormalDot(aligned, center)).toBeGreaterThan(0);
  });

  it('keeps outward-facing normals on indexed −X-only muscle geometry after mirror', () => {
    const geometry = new BoxGeometry(0.2, 0.3, 0.08);
    geometry.translate(-0.15, 1.25, -0.04);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.max.x).toBeLessThanOrEqual(0);

    const aligned = alignSkinEnvelopeToStudyHalf(geometry.clone());
    aligned.computeBoundingBox();
    const center = aligned.boundingBox!.getCenter(new Vector3());
    expect(outwardNormalDot(aligned, center)).toBeGreaterThan(0);
  });
});

describe('mirrorClippedSkinToReferenceHalf', () => {
  it('mirrors a +X clipped shell onto −X with outward normals', () => {
    const geometry = new BoxGeometry(0.2, 0.4, 0.1);
    geometry.translate(0.1, 0.5, 0);

    const mirrored = mirrorClippedSkinToReferenceHalf(geometry);
    mirrored.computeBoundingBox();
    expect(mirrored.boundingBox!.max.x).toBeLessThanOrEqual(0.001);
    expect(mirrored.boundingBox!.min.x).toBeLessThan(-0.05);

    const center = mirrored.boundingBox!.getCenter(new Vector3());
    expect(outwardNormalDot(mirrored, center)).toBeGreaterThan(0);
  });
});

describe('flipGeometryWinding', () => {
  it('restores outward normals after an X mirror on indexed geometry', () => {
    const geometry = new BoxGeometry(0.1, 0.1, 0.1);
    geometry.translate(-0.2, 0, 0);

    const mirrored = geometry.clone();
    mirrored.scale(-1, 1, 1);
    mirrored.computeVertexNormals();
    mirrored.computeBoundingBox();
    const center = mirrored.boundingBox!.getCenter(new Vector3());
    expect(outwardNormalDot(mirrored, center)).toBeLessThan(0);

    flipGeometryWinding(mirrored);
    mirrored.computeVertexNormals();
    expect(outwardNormalDot(mirrored, center)).toBeGreaterThan(0);
  });
});
