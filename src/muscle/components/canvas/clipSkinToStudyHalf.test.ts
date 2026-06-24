import { BufferAttribute, BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { clipSkinGeometryToStudyHalf } from './clipSkinToStudyHalf';

describe('clipSkinGeometryToStudyHalf', () => {
  it('removes triangles whose centroid lies on the −X side', () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array([-0.1, 0, 0, 0.1, 0, 0, 0.1, 1, 0, -0.1, 1, 0]), 3),
    );
    geometry.setIndex([0, 1, 2, 0, 2, 3]);

    const clipped = clipSkinGeometryToStudyHalf(geometry, 0, {
      anyVertexOnHalf: false,
      preserveMidlinePelvis: false,
    });
    expect(clipped.getIndex()?.count).toBe(3);
  });

  it('keeps border triangles when any vertex reaches the study half', () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new BufferAttribute(
        new Float32Array([
          -0.05, 1.2, 0, 0.05, 1.2, 0, 0.05, 1.25, 0,
        ]),
        3,
      ),
    );
    geometry.setIndex([0, 1, 2]);

    const clipped = clipSkinGeometryToStudyHalf(geometry, 0, {
      anyVertexOnHalf: true,
      preserveMidlinePelvis: false,
    });
    expect(clipped.getIndex()?.count).toBe(3);
  });

  it('preserves midline pelvis triangles for full groin coverage', () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new BufferAttribute(
        new Float32Array([
          -0.01, 0.92, 0.04, 0.01, 0.92, 0.04, 0, 0.95, 0.05,
        ]),
        3,
      ),
    );
    geometry.setIndex([0, 1, 2]);

    const clipped = clipSkinGeometryToStudyHalf(geometry, 0.02, {
      anyVertexOnHalf: false,
      preserveMidlinePelvis: true,
    });
    expect(clipped.getIndex()?.count).toBe(3);
  });

  it('preserves midline clavicle triangles for suprasternal skin coverage', () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new BufferAttribute(
        new Float32Array([
          -0.02, 1.42, 0.02, 0.02, 1.42, 0.02, 0, 1.45, 0.03,
        ]),
        3,
      ),
    );
    geometry.setIndex([0, 1, 2]);

    const clipped = clipSkinGeometryToStudyHalf(geometry, 0.02, {
      anyVertexOnHalf: false,
      preserveMidlinePelvis: false,
      preserveMidlineThorax: true,
    });
    expect(clipped.getIndex()?.count).toBe(3);
  });

  it('preserves midline face triangles for nose/lip sagittal seam coverage', () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new BufferAttribute(
        new Float32Array([
          -0.02, 1.52, 0.08, 0.02, 1.52, 0.08, 0, 1.55, 0.1,
        ]),
        3,
      ),
    );
    geometry.setIndex([0, 1, 2]);

    const clipped = clipSkinGeometryToStudyHalf(geometry, 0.02, {
      anyVertexOnHalf: false,
      preserveMidlinePelvis: false,
      preserveMidlineFace: true,
    });
    expect(clipped.getIndex()?.count).toBe(3);
  });

  it('preserves midline anterior neck triangles for platysma junction coverage', () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new BufferAttribute(
        new Float32Array([
          -0.03, 1.18, 0.04, 0.03, 1.18, 0.04, 0, 1.22, 0.05,
        ]),
        3,
      ),
    );
    geometry.setIndex([0, 1, 2]);

    const clipped = clipSkinGeometryToStudyHalf(geometry, 0.02, {
      anyVertexOnHalf: false,
      preserveMidlinePelvis: false,
      preserveMidlineAnteriorNeck: true,
    });
    expect(clipped.getIndex()?.count).toBe(3);
  });
});
