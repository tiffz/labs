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

    const clipped = clipSkinGeometryToStudyHalf(geometry, 0);
    expect(clipped.getIndex()?.count).toBe(3);
  });
});
