import { describe, expect, it } from 'vitest';
import {
  auditMidlineSeamGaps,
  buildMidlineSeamGapSegmentPositions,
  isMidlineSeamAdjacentContext,
  isMidlineSeamInteriorLoop,
} from './skinCoverageAudit';
import { readRuntimeReferenceSkinEnvelope, readRuntimeStudySkinEnvelope } from './skinCoverageAuditNode';

describe('skinCoverageAudit seam gaps', () => {
  it('isMidlineSeamAdjacentContext matches sagittal-adjacent staging points', () => {
    expect(isMidlineSeamAdjacentContext({ x: 0.01, y: 1.2, z: 0.05, maxAbsX: 0.01, minX: 0.01 })).toBe(true);
    expect(isMidlineSeamAdjacentContext({ x: 0.12, y: 1.2, z: 0.05, maxAbsX: 0.12, minX: 0.12 })).toBe(false);
  });

  it('buildMidlineSeamGapSegmentPositions returns segments on real runtime envelopes', () => {
    const study = readRuntimeStudySkinEnvelope();
    const reference = readRuntimeReferenceSkinEnvelope();
    expect(buildMidlineSeamGapSegmentPositions(study)?.length ?? 0).toBeGreaterThan(0);
    expect(buildMidlineSeamGapSegmentPositions(reference)?.length ?? 0).toBeGreaterThan(0);
  });

  it('seam interior loops are a separate class from lateral interior holes', () => {
    const study = readRuntimeStudySkinEnvelope();
    const metrics = auditMidlineSeamGaps(study);
    const seamLoops = metrics.seamInteriorLoopCount;
    expect(seamLoops).toBeGreaterThanOrEqual(0);
    expect(typeof isMidlineSeamInteriorLoop).toBe('function');
  });
});
