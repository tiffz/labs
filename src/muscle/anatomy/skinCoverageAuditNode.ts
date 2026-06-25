import { alignSkinEnvelopeToStudyHalf } from '../components/canvas/alignSkinEnvelopeGeometry';
import { clipSkinGeometryToStudyHalf } from '../components/canvas/clipSkinToStudyHalf';
import { readGlbSkinEnvelopeGeometry, SKIN_GLB_PATH } from './skinGlbEnvelopeReader';
import { auditSkinCoverageBands, type SkinCoverageBandMetrics } from './skinCoverageAudit';

export { SKIN_GLB_PATH };

export function readRuntimeStudySkinEnvelope(glbRelativePath = SKIN_GLB_PATH): import('three').BufferGeometry {
  const aligned = alignSkinEnvelopeToStudyHalf(readGlbSkinEnvelopeGeometry(glbRelativePath).clone());
  return clipSkinGeometryToStudyHalf(aligned, 0, {
    anyVertexOnHalf: true,
    preserveMidlinePelvis: true,
    preserveMidlineThorax: true,
    preserveMidlineFace: true,
    preserveMidlineAnteriorNeck: true,
  });
}

export function auditRuntimeSkinCoverage(glbRelativePath = SKIN_GLB_PATH): SkinCoverageBandMetrics[] {
  return auditSkinCoverageBands(readRuntimeStudySkinEnvelope(glbRelativePath));
}
