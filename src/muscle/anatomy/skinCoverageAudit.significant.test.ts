import { describe, expect, it } from 'vitest';
import {
  buildInteriorHoleLoopSegmentPositions,
  buildSkinHoleDebugSegmentPositions,
  findBoundaryLoops,
  findMidlineThroatHoleLoops,
  isPalmarStudyDebugHoleLoop,
  isSignificantVisibleSkinHoleLoop,
  PALM_WRIST_DEBUG_BOUNDS,
} from './skinCoverageAudit';
import { readRuntimeStudySkinEnvelope } from './skinCoverageAuditNode';

/** Visible delt/pec junction hole that regressed at y≈1.39, |x|≈0.14 (pre fill-axis fix). */
const DELT_PEC_HOLE_BOUNDS = {
  minY: 1.34,
  maxY: 1.42,
  minAbsX: 0.11,
  maxAbsX: 0.17,
  minZ: -0.05,
};

function formatThroatLoops(loops: ReturnType<typeof findMidlineThroatHoleLoops>): string {
  return loops
    .map(
      (loop) =>
        `${loop.edgeCount} edges @ y=${loop.centroid.y.toFixed(3)} z=${loop.centroid.z.toFixed(3)} maxAbsX=${loop.maxAbsX.toFixed(3)}`,
    )
    .join('; ');
}

describe('significant shoulder hole filter', () => {
  it('has no midline throat holes after export fill (adam apple / submental band)', () => {
    const geometry = readRuntimeStudySkinEnvelope();
    const throatLoops = findMidlineThroatHoleLoops(geometry);
    expect(
      throatLoops,
      `midline throat still open — re-run atlas_skin export fill (${formatThroatLoops(throatLoops)})`,
    ).toHaveLength(0);
  });
  it('does not regress the visible delt/pec junction hole band', () => {
    const geometry = readRuntimeStudySkinEnvelope();
    const deltBandLoops = findBoundaryLoops(geometry).filter((loop) => {
      const absX = Math.abs(loop.centroid.x);
      if (loop.centroid.y < DELT_PEC_HOLE_BOUNDS.minY || loop.centroid.y > DELT_PEC_HOLE_BOUNDS.maxY) {
        return false;
      }
      if (absX < DELT_PEC_HOLE_BOUNDS.minAbsX || absX > DELT_PEC_HOLE_BOUNDS.maxAbsX) {
        return false;
      }
      if (loop.centroid.z < DELT_PEC_HOLE_BOUNDS.minZ) return false;
      return loop.minAbsX > 0.035 && loop.edgeCount >= 4;
    });
    const largest = deltBandLoops.reduce((max, loop) => Math.max(max, loop.edgeCount), 0);
    expect(
      largest,
      `delt/pec band still has a ${largest}-edge interior loop — re-check export fill`,
    ).toBeLessThan(30);
  });

  it('debug overlay includes throat/trap classifiers without shoulder-only bounds', () => {
    const geometry = readRuntimeStudySkinEnvelope();
    const allInterior = findBoundaryLoops(geometry).filter(
      (loop) => loop.minAbsX > 0.035 && loop.edgeCount >= 4,
    );
    const position = geometry.getAttribute('position')!;
    const significant = findBoundaryLoops(geometry).filter((loop) =>
      isSignificantVisibleSkinHoleLoop(loop, position, {
        minEdgeCount: 14,
        minDiameter: 0.012,
      }),
    );
    const segments = buildInteriorHoleLoopSegmentPositions(geometry, {
      minEdgeCount: 14,
      minDiameter: 0.012,
    });

    expect(significant.length).toBeLessThan(allInterior.length);
    expect(significant.length).toBeGreaterThan(0);
    expect(segments).not.toBeNull();
  });

  it('study debug overlay marks palmar loops on transparent half (8+ edges)', () => {
    const geometry = readRuntimeStudySkinEnvelope();
    const position = geometry.getAttribute('position')!;
    const palmarRelaxed = findBoundaryLoops(geometry).filter((loop) =>
      isPalmarStudyDebugHoleLoop(loop, position),
    );
    const debugSegments = buildSkinHoleDebugSegmentPositions(geometry);
    expect(
      palmarRelaxed.length,
      'expected palmar interior loops in study clip for debug',
    ).toBeGreaterThan(0);
    expect(debugSegments).not.toBeNull();
    expect(debugSegments!.length).toBeGreaterThan(palmarRelaxed.length * 6);
    for (const loop of palmarRelaxed) {
      expect(loop.centroid.y).toBeGreaterThanOrEqual(PALM_WRIST_DEBUG_BOUNDS.minY);
      expect(loop.maxAbsX).toBeGreaterThan(PALM_WRIST_DEBUG_BOUNDS.minAbsX);
    }
  });
});
