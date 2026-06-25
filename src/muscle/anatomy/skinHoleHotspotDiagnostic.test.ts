import { describe, expect, it } from 'vitest';
import {
  findBoundaryLoops,
  isInteriorSkinHoleLoop,
} from './skinCoverageAudit';
import { alignSkinEnvelopeToStudyHalf } from '../components/canvas/alignSkinEnvelopeGeometry';
import { clipSkinGeometryToStudyHalf } from '../components/canvas/clipSkinToStudyHalf';
import { readGlbSkinEnvelopeGeometry } from './skinGlbEnvelopeReader';

/** Platysma / lateral neck / trap–delt junction — matches user-reported hole band. */
const PLATYSMA_HOTSPOT = {
  minY: 1.05,
  maxY: 1.55,
  minAbsX: 0.04,
  maxAbsX: 0.28,
};

function inHotspot(x: number, y: number): boolean {
  return (
    y >= PLATYSMA_HOTSPOT.minY &&
    y <= PLATYSMA_HOTSPOT.maxY &&
    Math.abs(x) >= PLATYSMA_HOTSPOT.minAbsX &&
    Math.abs(x) <= PLATYSMA_HOTSPOT.maxAbsX
  );
}

describe('skinHoleHotspotDiagnostic', () => {
  it('reports interior boundary loops in platysma / lateral neck hotspot', () => {
    if (process.env.MUSCLE_SKIN_HOLE_DIAG !== '1') return;

    const raw = readGlbSkinEnvelopeGeometry();
    const aligned = alignSkinEnvelopeToStudyHalf(raw.clone());
    const clipped = clipSkinGeometryToStudyHalf(aligned.clone(), 0, {
      anyVertexOnHalf: true,
      preserveMidlinePelvis: true,
      preserveMidlineThorax: true,
      preserveMidlineFace: true,
      preserveMidlineAnteriorNeck: true,
    });

    for (const [label, geometry] of [
      ['raw', raw],
      ['aligned', aligned],
      ['runtime-clipped', clipped],
    ] as const) {
      const loops = findBoundaryLoops(geometry)
        .filter(isInteriorSkinHoleLoop)
        .filter((loop) => inHotspot(loop.centroid.x, loop.centroid.y))
        .sort((a, b) => b.edgeCount - a.edgeCount);

      console.warn(`\n# ${label} — ${loops.length} interior loops in platysma hotspot`);
      for (const loop of loops.slice(0, 12)) {
        console.warn(
          `  ${loop.edgeCount} edges @ x=${loop.centroid.x.toFixed(3)} y=${loop.centroid.y.toFixed(3)} z=${loop.centroid.z.toFixed(3)} minAbsX=${loop.minAbsX.toFixed(3)}`,
        );
      }
    }

    expect(true).toBe(true);
  });
});
