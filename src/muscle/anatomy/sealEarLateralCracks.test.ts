import { describe, expect, it } from 'vitest';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { alignSkinEnvelopeToStudyHalf } from '../components/canvas/alignSkinEnvelopeGeometry';
import { clipSkinGeometryForStudyHalf } from '../components/canvas/skinHalfClipOptions';
import { countLateralEarOpenBoundaryEdges } from './earShellAudit';
import slitBaseline from './skinLimbSlitBaseline.json';
import { countGlTfSlitOpenBoundaryEdges } from './skinLimbSlitAudit';
import { sealEarLateralBoundaryCracks } from './sealEarLateralCracks';
import { readSkinEnvelopePrimitiveParts } from './skinEnvelopePrimitiveParts.testutil';

describe('sealEarLateralCracks', () => {
  it('documents high open-edge count on unwelded glTF primitive merge', () => {
    const parts = readSkinEnvelopePrimitiveParts();
    const unwelded = mergeGeometries(parts, false);
    expect(unwelded).not.toBeNull();
    const aligned = alignSkinEnvelopeToStudyHalf(unwelded!);
    expect(countLateralEarOpenBoundaryEdges(aligned)).toBeGreaterThan(40);
  });

  it('bridge stitch reduces auricular slits without mirror back-fill duplicates', () => {
    const parts = readSkinEnvelopePrimitiveParts();
    const merged = mergeVertices(mergeGeometries(parts, false)!, 0.0012);
    const aligned = alignSkinEnvelopeToStudyHalf(merged);
    const before = countLateralEarOpenBoundaryEdges(aligned);
    expect(before).toBeGreaterThan(8);
    const sealed = sealEarLateralBoundaryCracks(aligned);
    const after = countLateralEarOpenBoundaryEdges(sealed);
    expect(after).toBeLessThan(before);
    expect(sealed.index!.count).toBeGreaterThan(aligned.index!.count);
    expect(after).toBeLessThanOrEqual(slitBaseline.maxLateralEarSlitOpenBoundaryEdges);
  });

  it('bridge stitch on clipped study half stays within slit baseline', () => {
    const parts = readSkinEnvelopePrimitiveParts();
    const merged = mergeVertices(mergeGeometries(parts, false)!, 0.0012);
    const aligned = alignSkinEnvelopeToStudyHalf(merged);
    const sealed = sealEarLateralBoundaryCracks(aligned);
    const clipped = clipSkinGeometryForStudyHalf(sealed.clone());
    expect(countLateralEarOpenBoundaryEdges(clipped)).toBeLessThanOrEqual(
      slitBaseline.maxLateralEarSlitOpenBoundaryEdges,
    );
    expect(countGlTfSlitOpenBoundaryEdges(clipped)).toBeLessThanOrEqual(
      slitBaseline.maxGlTfSlitOpenBoundaryEdges,
    );
  });
});
