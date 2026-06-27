import { describe, expect, it } from 'vitest';
import {
  buildPalmarEminenceDiagnosticSegmentPositions,
  buildSkinHoleDebugSegmentPositions,
  findBoundaryLoops,
  findMidlineThroatHoleLoops,
  isEarLateralDebugHoleLoop,
  isPalmarStudyDebugHoleLoop,
  isSignificantVisibleSkinHoleLoop,
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

/** Known palm medial cuff export hole until atlas_skin re-export (Phase 3). */
const PALM_CUFF_DEBUG_SEGMENT_FLOATS = 84;

function isKnownPalmCuffExportLoop(loop: { edgeCount: number; centroid: { y: number; x: number } }): boolean {
  return loop.edgeCount === 14 && loop.centroid.y > 0.84 && loop.centroid.y < 0.92 && Math.abs(loop.centroid.x) < 0.12;
}

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

  it('debug overlay filters micro-seams from significant shoulder-class loops', () => {
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
    const segments = buildSkinHoleDebugSegmentPositions(geometry);

    expect(significant.length).toBeLessThanOrEqual(allInterior.length);
    expect(significant.length).toBeLessThanOrEqual(1);
    expect(significant.every(isKnownPalmCuffExportLoop)).toBe(true);
    expect(segments?.length ?? 0).toBeLessThanOrEqual(PALM_CUFF_DEBUG_SEGMENT_FLOATS);
  });

  it('study debug overlay is empty except known palm cuff export hole', () => {
    const geometry = readRuntimeStudySkinEnvelope();
    const position = geometry.getAttribute('position')!;
    const palmarRelaxed = findBoundaryLoops(geometry).filter((loop) =>
      isPalmarStudyDebugHoleLoop(loop, position),
    );
    const debugSegments = buildSkinHoleDebugSegmentPositions(geometry);
    expect(palmarRelaxed).toHaveLength(0);
    expect(debugSegments?.length ?? 0).toBeLessThanOrEqual(PALM_CUFF_DEBUG_SEGMENT_FLOATS);
  });

  it('palmar eminence diagnostic marks thenar + hypothenar pad bands', () => {
    const geometry = readRuntimeStudySkinEnvelope();
    const diagnostic = buildPalmarEminenceDiagnosticSegmentPositions(geometry);
    expect(diagnostic).not.toBeNull();
    expect(diagnostic!.length).toBeGreaterThanOrEqual(180);
  });

  it('auricular band has no interior loops after ear seam weld', () => {
    const geometry = readRuntimeStudySkinEnvelope();
    const position = geometry.getAttribute('position')!;
    const earLoops = findBoundaryLoops(geometry).filter((loop) =>
      isEarLateralDebugHoleLoop(loop, position),
    );
    expect(earLoops).toHaveLength(0);
  });

  it('study half has no significant interior loops beyond known palm cuff export hole', () => {
    const geometry = readRuntimeStudySkinEnvelope();
    const position = geometry.getAttribute('position')!;
    const significant = findBoundaryLoops(geometry).filter((loop) =>
      isSignificantVisibleSkinHoleLoop(loop, position, { minEdgeCount: 14, minDiameter: 0.012 }),
    );
    expect(
      significant,
      significant.map((loop) => `${loop.edgeCount} edges @ y=${loop.centroid.y.toFixed(2)} x=${loop.centroid.x.toFixed(3)}`).join('; '),
    ).toHaveLength(1);
    expect(isKnownPalmCuffExportLoop(significant[0]!)).toBe(true);
  });
});
