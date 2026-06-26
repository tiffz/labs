import { describe, expect, it } from 'vitest';
import { alignSkinEnvelopeToStudyHalf } from '../components/canvas/alignSkinEnvelopeGeometry';
import {
  clipSkinGeometryForReferenceHalf,
  clipSkinGeometryForStudyHalf,
  countReferenceMirrorBleedTriangles,
} from '../components/canvas/skinHalfClipOptions';
import { readGlbSkinEnvelopeGeometry } from './skinGlbEnvelopeReader';

function countBandTriangles(
  geometry: import('three').BufferGeometry,
  band: { minY: number; maxY: number; minAbsX: number; maxAbsX: number; minZ?: number; maxZ?: number },
): number {
  const position = geometry.getAttribute('position')!;
  const index = geometry.getIndex()!;
  let count = 0;
  for (let tri = 0; tri < index.count / 3; tri += 1) {
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    for (let c = 0; c < 3; c += 1) {
      const vi = index.getX(tri * 3 + c)!;
      xs.push(Math.abs(position.getX(vi)));
      ys.push(position.getY(vi));
      zs.push(position.getZ(vi));
    }
    const cy = (ys[0]! + ys[1]! + ys[2]!) / 3;
    const cz = (zs[0]! + zs[1]! + zs[2]!) / 3;
    const maxAbsX = Math.max(...xs);
    const minAbsX = Math.min(...xs);
    if (cy < band.minY || cy > band.maxY) continue;
    if (maxAbsX < band.minAbsX || minAbsX > band.maxAbsX) continue;
    if (band.minZ !== undefined && cz < band.minZ) continue;
    if (band.maxZ !== undefined && cz > band.maxZ) continue;
    count += 1;
  }
  return count;
}

describe('skinHalfSplitAudit', () => {
  it('reference clip has zero mirror-bleed triangles (no opaque patches on study side)', () => {
    const aligned = alignSkinEnvelopeToStudyHalf(readGlbSkinEnvelopeGeometry().clone());
    const reference = clipSkinGeometryForReferenceHalf(aligned);
    const bleed = countReferenceMirrorBleedTriangles(reference);
    expect(
      bleed,
      `${bleed} reference triangles have local minX < 0 and mirror onto world +X`,
    ).toBe(0);
  });

  it('study clip retains palmar skin band (FrontSide shell needs both sides — see SkinEnvelopeLayer DoubleSide)', () => {
    const aligned = alignSkinEnvelopeToStudyHalf(readGlbSkinEnvelopeGeometry().clone());
    const study = clipSkinGeometryForStudyHalf(aligned);
    const palmTris = countBandTriangles(study, {
      minY: 0.82,
      maxY: 1.02,
      minAbsX: 0.08,
      maxAbsX: 0.32,
      minZ: -0.12,
      maxZ: 0.08,
    });
    expect(palmTris, 'palmar band triangle count after study clip').toBeGreaterThan(400);
  });

  it('study clip retains palmar-facing skin (anterior palm void on transparent half)', () => {
    const aligned = alignSkinEnvelopeToStudyHalf(readGlbSkinEnvelopeGeometry().clone());
    const study = clipSkinGeometryForStudyHalf(aligned);
    const palmarTris = countBandTriangles(study, {
      minY: 0.84,
      maxY: 0.98,
      minAbsX: 0.14,
      maxAbsX: 0.32,
      minZ: 0.02,
      maxZ: 0.12,
    });
    expect(palmarTris, 'anterior palmar band triangle count after study clip').toBeGreaterThan(80);
  });

  it('reference clip retains lateral ear band (strict minVertexX otherwise shreds helix on opaque half)', () => {
    const aligned = alignSkinEnvelopeToStudyHalf(readGlbSkinEnvelopeGeometry().clone());
    const reference = clipSkinGeometryForReferenceHalf(aligned);
    const earTris = countBandTriangles(reference, {
      minY: 1.44,
      maxY: 1.68,
      minAbsX: 0.06,
      maxAbsX: 0.15,
      minZ: -0.1,
      maxZ: 0.08,
    });
    expect(earTris, 'auricular band triangle count after reference clip').toBeGreaterThan(350);
  });

  it('study clip retains ankle band skin (wrist/ankle opaque bands were mirror bleed + holes)', () => {
    const aligned = alignSkinEnvelopeToStudyHalf(readGlbSkinEnvelopeGeometry().clone());
    const study = clipSkinGeometryForStudyHalf(aligned);
    const ankleTris = countBandTriangles(study, {
      minY: 0.02,
      maxY: 0.14,
      minAbsX: 0.04,
      maxAbsX: 0.14,
      minZ: -0.08,
      maxZ: 0.12,
    });
    expect(ankleTris).toBeGreaterThan(120);
  });
});
