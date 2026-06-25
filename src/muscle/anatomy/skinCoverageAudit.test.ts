import { describe, expect, it } from 'vitest';
import {
  auditPlatysmaHotspotHoles,
  formatSkinCoverageAudit,
  totalSkinBoundaryEdges,
} from './skinCoverageAudit';
import { auditRuntimeSkinCoverage, readRuntimeStudySkinEnvelope } from './skinCoverageAuditNode';
import skinCoverageBaseline from './skinCoverageBaseline.json';
import { loadSkinBoundaryBaseline } from './skinBoundaryBaseline';

describe('skinCoverageAudit', () => {
  it('does not regress runtime skin coverage bands (triangles, seams, interior holes)', () => {
    const rows = auditRuntimeSkinCoverage();
    const failures: string[] = [];

    for (const row of rows) {
      const minTris = skinCoverageBaseline.minTrianglesByBand[row.id as keyof typeof skinCoverageBaseline.minTrianglesByBand];
      const maxEdges = skinCoverageBaseline.maxBoundaryEdgesByBand[row.id as keyof typeof skinCoverageBaseline.maxBoundaryEdgesByBand];
      const maxLoops = skinCoverageBaseline.maxInteriorLoopsByBand[row.id as keyof typeof skinCoverageBaseline.maxInteriorLoopsByBand];
      const maxLoopEdges =
        skinCoverageBaseline.maxLargestInteriorLoopEdgesByBand?.[
          row.id as keyof typeof skinCoverageBaseline.maxLargestInteriorLoopEdgesByBand
        ];

      if (minTris !== undefined && row.triangleCount < minTris) {
        failures.push(`${row.id}: ${row.triangleCount} tris < ${minTris}`);
      }
      if (maxEdges !== undefined && row.boundaryEdgeCount > maxEdges) {
        failures.push(`${row.id}: ${row.boundaryEdgeCount} seam edges > ${maxEdges}`);
      }
      if (maxLoops !== undefined && row.interiorLoopCount > maxLoops) {
        failures.push(
          `${row.id}: ${row.interiorLoopCount} interior loops (max ${row.largestInteriorLoopEdges} edges) > ${maxLoops}`,
        );
      }
      if (maxLoopEdges !== undefined && row.largestInteriorLoopEdges > maxLoopEdges) {
        failures.push(
          `${row.id}: largest interior loop ${row.largestInteriorLoopEdges} edges > ${maxLoopEdges}`,
        );
      }
    }

    expect(failures, formatSkinCoverageAudit(rows)).toEqual([]);
  });

  it('does not regress platysma hotspot interior holes (visible lateral neck gaps)', () => {
    const geometry = readRuntimeStudySkinEnvelope();
    const hotspot = auditPlatysmaHotspotHoles(geometry);
    const maxLoops = skinCoverageBaseline.platysmaHotspotMaxInteriorLoops ?? Number.POSITIVE_INFINITY;
    const maxLargest =
      skinCoverageBaseline.platysmaHotspotMaxLargestLoopEdges ?? Number.POSITIVE_INFINITY;

    expect(
      hotspot.interiorLoopCount,
      `platysma hotspot: ${hotspot.interiorLoopCount} interior loops (largest ${hotspot.largestInteriorLoopEdges} edges)`,
    ).toBeLessThanOrEqual(maxLoops);
    expect(
      hotspot.largestInteriorLoopEdges,
      `platysma hotspot largest loop: ${hotspot.largestInteriorLoopEdges} edges`,
    ).toBeLessThanOrEqual(maxLargest);
  });

  it('does not regress global skin boundary edge count', () => {
    const geometry = readRuntimeStudySkinEnvelope();
    const total = totalSkinBoundaryEdges(geometry);
    const cap = loadSkinBoundaryBaseline().maxBoundaryEdgesByMesh.skin_envelope ?? Number.POSITIVE_INFINITY;
    expect(total).toBeLessThanOrEqual(cap);
  });

  it('prints coverage audit when MUSCLE_SKIN_COVERAGE_AUDIT=1', () => {
    if (process.env.MUSCLE_SKIN_COVERAGE_AUDIT !== '1') return;
    const rows = auditRuntimeSkinCoverage();
    console.warn('# Runtime skin coverage audit\n', formatSkinCoverageAudit(rows));
    expect(rows.length).toBeGreaterThan(0);
  });
});
