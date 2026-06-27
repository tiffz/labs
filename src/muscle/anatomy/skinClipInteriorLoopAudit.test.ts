import { describe, expect, it } from 'vitest';
import {
  buildSkinHoleDebugSegmentPositions,
  findBoundaryLoops,
  isInteriorSkinHoleLoop,
  isSignificantVisibleSkinHoleLoop,
} from './skinCoverageAudit';
import { readRuntimeReferenceSkinEnvelope, readRuntimeStudySkinEnvelope } from './skinCoverageAuditNode';

/** One 14-edge palm cuff loop → 84 debug segment floats (6 floats per edge). */
const PALM_CUFF_DEBUG_SEGMENT_FLOATS = 84;

describe('skinClipInteriorLoopAudit', () => {
  it('study clip does not open significant interior loops beyond known palm cuff export hole', () => {
    const geometry = readRuntimeStudySkinEnvelope();
    const position = geometry.getAttribute('position')!;
    const significant = findBoundaryLoops(geometry).filter((loop) =>
      isSignificantVisibleSkinHoleLoop(loop, position, { minEdgeCount: 14, minDiameter: 0.012 }),
    );
    expect(significant.length, 'significant interior loops on study half').toBeLessThanOrEqual(1);
    const debugFloats = buildSkinHoleDebugSegmentPositions(geometry)?.length ?? 0;
    expect(debugFloats).toBeLessThanOrEqual(PALM_CUFF_DEBUG_SEGMENT_FLOATS);
  });

  it('reference clip does not open interior loops in palm or upper-arm preserve bands', () => {
    const geometry = readRuntimeReferenceSkinEnvelope();
    const interior = findBoundaryLoops(geometry).filter(isInteriorSkinHoleLoop);
    expect(interior).toHaveLength(0);
  });
});
