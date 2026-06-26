import { alignSkinEnvelopeToStudyHalf } from '../components/canvas/alignSkinEnvelopeGeometry';
import {
  clipSkinGeometryForReferenceHalf,
  clipSkinGeometryForStudyHalf,
} from '../components/canvas/skinHalfClipOptions';
import { readGlbSkinEnvelopeGeometry, SKIN_GLB_PATH } from './skinGlbEnvelopeReader';
import {
  auditMidlineSeamGaps,
  auditSkinCoverageBands,
  type MidlineSeamGapMetrics,
  type SkinCoverageBandMetrics,
} from './skinCoverageAudit';

export { SKIN_GLB_PATH };

function readAlignedSkinEnvelope(glbRelativePath = SKIN_GLB_PATH): import('three').BufferGeometry {
  return alignSkinEnvelopeToStudyHalf(readGlbSkinEnvelopeGeometry(glbRelativePath).clone());
}

export function readRuntimeStudySkinEnvelope(glbRelativePath = SKIN_GLB_PATH): import('three').BufferGeometry {
  return clipSkinGeometryForStudyHalf(readAlignedSkinEnvelope(glbRelativePath));
}

export function readRuntimeReferenceSkinEnvelope(
  glbRelativePath = SKIN_GLB_PATH,
): import('three').BufferGeometry {
  return clipSkinGeometryForReferenceHalf(readAlignedSkinEnvelope(glbRelativePath));
}

export function auditRuntimeSkinCoverage(glbRelativePath = SKIN_GLB_PATH): SkinCoverageBandMetrics[] {
  return auditSkinCoverageBands(readRuntimeStudySkinEnvelope(glbRelativePath));
}

export function auditRuntimeReferenceSkinCoverage(
  glbRelativePath = SKIN_GLB_PATH,
): SkinCoverageBandMetrics[] {
  return auditSkinCoverageBands(readRuntimeReferenceSkinEnvelope(glbRelativePath));
}

export type RuntimeMidlineSeamAudit = {
  study: MidlineSeamGapMetrics;
  reference: MidlineSeamGapMetrics;
};

export function auditRuntimeMidlineSeamGaps(glbRelativePath = SKIN_GLB_PATH): RuntimeMidlineSeamAudit {
  return {
    study: auditMidlineSeamGaps(readRuntimeStudySkinEnvelope(glbRelativePath)),
    reference: auditMidlineSeamGaps(readRuntimeReferenceSkinEnvelope(glbRelativePath)),
  };
}
