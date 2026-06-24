import { BoxGeometry, BufferGeometry, Float32BufferAttribute } from 'three';
import { describe, expect, it } from 'vitest';
import { alignSkinEnvelopeToStudyHalf } from './alignSkinEnvelopeGeometry';
import { clipSkinGeometryToStudyHalf } from './clipSkinToStudyHalf';

function triangleCount(geometry: BufferGeometry): number {
  const index = geometry.getIndex();
  return index ? index.count / 3 : geometry.getAttribute('position').count / 3;
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
    expect(aligned.boundingBox!.min.x).toBeGreaterThanOrEqual(0);

    const clipped = clipSkinGeometryToStudyHalf(aligned, 0);
    expect(triangleCount(clipped)).toBe(2);
  });

  it('does not mirror +X-heavy envelopes', () => {
    const geometry = new BoxGeometry(0.2, 0.4, 0.1);
    geometry.translate(0.15, 0.2, 0);
    const aligned = alignSkinEnvelopeToStudyHalf(geometry);
    aligned.computeBoundingBox();
    expect(aligned.boundingBox!.min.x).toBeGreaterThan(0);
  });
});
