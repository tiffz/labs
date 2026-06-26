import { describe, expect, it } from 'vitest';
import { auditRuntimeMidlineSeamGaps } from './skinCoverageAuditNode';
import seamBaseline from './skinSeamGapBaseline.json';

describe('skinSeamGapAudit', () => {
  it('tracks midline seam gaps on study and reference halves separately', () => {
    const audit = auditRuntimeMidlineSeamGaps();
    const failures: string[] = [];

    if (audit.study.seamBoundaryEdgeCount > seamBaseline.studyMaxSeamBoundaryEdges) {
      failures.push(
        `study seam boundary edges ${audit.study.seamBoundaryEdgeCount} > ${seamBaseline.studyMaxSeamBoundaryEdges}`,
      );
    }
    if (audit.study.seamInteriorLoopCount > seamBaseline.studyMaxSeamInteriorLoops) {
      failures.push(
        `study seam interior loops ${audit.study.seamInteriorLoopCount} > ${seamBaseline.studyMaxSeamInteriorLoops}`,
      );
    }
    if (audit.reference.seamBoundaryEdgeCount > seamBaseline.referenceMaxSeamBoundaryEdges) {
      failures.push(
        `reference seam boundary edges ${audit.reference.seamBoundaryEdgeCount} > ${seamBaseline.referenceMaxSeamBoundaryEdges}`,
      );
    }
    if (audit.reference.seamInteriorLoopCount > seamBaseline.referenceMaxSeamInteriorLoops) {
      failures.push(
        `reference seam interior loops ${audit.reference.seamInteriorLoopCount} > ${seamBaseline.referenceMaxSeamInteriorLoops}`,
      );
    }

    expect(
      failures,
      [
        `study: ${audit.study.seamBoundaryEdgeCount} seam edges, ${audit.study.seamInteriorLoopCount} seam loops`,
        `reference: ${audit.reference.seamBoundaryEdgeCount} seam edges, ${audit.reference.seamInteriorLoopCount} seam loops`,
      ].join('\n'),
    ).toEqual([]);
  });
});
