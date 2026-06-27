import { describe, expect, it } from 'vitest';
import slitBaseline from './skinLimbSlitBaseline.json';
import { readRuntimeReferenceSkinEnvelope, readRuntimeStudySkinEnvelope } from './skinCoverageAuditNode';
import {
  countGlTfSlitOpenBoundaryEdges,
  countLateralEarSlitOpenBoundaryEdges,
  countLateralForearmSlitOpenBoundaryEdges,
  countLateralPalmSlitOpenBoundaryEdges,
  countLateralUpperArmSlitOpenBoundaryEdges,
  countMedialEarAttachmentSlitOpenBoundaryEdges,
  countMedialThumbCmcSlitOpenBoundaryEdges,
} from './skinLimbSlitAudit';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { alignSkinEnvelopeToStudyHalf } from '../components/canvas/alignSkinEnvelopeGeometry';
import { clipSkinGeometryForStudyHalf } from '../components/canvas/skinHalfClipOptions';
import { readGlbSkinEnvelopeGeometry } from './skinGlbEnvelopeReader';
import { readSkinEnvelopePrimitiveParts } from './skinEnvelopePrimitiveParts.testutil';

describe('skinLimbSlitAudit', () => {
  it('documents glTF primitive slits before runtime bridge seal', () => {
    const parts = readSkinEnvelopePrimitiveParts();
    const unwelded = mergeGeometries(parts, false);
    expect(unwelded).not.toBeNull();
    const aligned = alignSkinEnvelopeToStudyHalf(unwelded!);
    expect(countGlTfSlitOpenBoundaryEdges(aligned)).toBeGreaterThan(20);
  });

  it('runtime study half glTF slits stay within bridge baseline (no mirror back-fill regression)', () => {
    const study = readRuntimeStudySkinEnvelope();
    expect(countGlTfSlitOpenBoundaryEdges(study)).toBeLessThanOrEqual(
      slitBaseline.maxGlTfSlitOpenBoundaryEdges,
    );
    expect(countLateralEarSlitOpenBoundaryEdges(study)).toBeLessThanOrEqual(
      slitBaseline.maxLateralEarSlitOpenBoundaryEdges,
    );
    expect(countMedialEarAttachmentSlitOpenBoundaryEdges(study)).toBeLessThanOrEqual(
      slitBaseline.maxMedialEarAttachmentSlitOpenBoundaryEdges,
    );
    expect(countLateralUpperArmSlitOpenBoundaryEdges(study)).toBeLessThanOrEqual(
      slitBaseline.maxLateralUpperArmSlitOpenBoundaryEdges,
    );
    expect(countLateralForearmSlitOpenBoundaryEdges(study)).toBeLessThanOrEqual(
      slitBaseline.maxLateralForearmSlitOpenBoundaryEdges,
    );
    expect(countMedialThumbCmcSlitOpenBoundaryEdges(study)).toBeLessThanOrEqual(
      slitBaseline.maxMedialThumbCmcSlitOpenBoundaryEdges,
    );
    expect(countLateralPalmSlitOpenBoundaryEdges(study)).toBeLessThanOrEqual(
      slitBaseline.maxLateralPalmSlitOpenBoundaryEdges,
    );
  });

  it('runtime reference half glTF slits stay within bridge baseline', () => {
    const reference = readRuntimeReferenceSkinEnvelope();
    expect(countGlTfSlitOpenBoundaryEdges(reference)).toBeLessThanOrEqual(
      slitBaseline.maxGlTfSlitOpenBoundaryEdges,
    );
  });

  it('study clip alone does not introduce new glTF slits beyond sealed weld', () => {
    const welded = readGlbSkinEnvelopeGeometry();
    const clipped = clipSkinGeometryForStudyHalf(alignSkinEnvelopeToStudyHalf(welded.clone()));
    expect(countGlTfSlitOpenBoundaryEdges(clipped)).toBeLessThanOrEqual(
      slitBaseline.maxGlTfSlitOpenBoundaryEdges,
    );
  });
});
