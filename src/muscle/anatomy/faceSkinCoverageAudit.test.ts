import { describe, expect, it } from 'vitest';
import {
  auditRawFaceSkinCoverage,
  auditRuntimeFaceSkinCoverage,
  formatFaceSkinCoverageAudit,
} from './faceSkinCoverageAudit';
import faceSkinCoverageBaseline from './faceSkinCoverageBaseline.json';

describe('faceSkinCoverageAudit', () => {
  it('includes auxiliary face skin in raw atlas_skin.glb', () => {
    const rows = auditRawFaceSkinCoverage();
    expect(rows.find((row) => row.id === 'eyebrow')!.triangleCount).toBeGreaterThan(
      faceSkinCoverageBaseline.minTrianglesByBand.eyebrow,
    );
    expect(rows.find((row) => row.id === 'earLateral')!.triangleCount).toBeGreaterThan(
      faceSkinCoverageBaseline.minTrianglesByBand.earLateral,
    );
  });

  it('keeps face skin bands after runtime align + sagittal clip', () => {
    const rows = auditRuntimeFaceSkinCoverage();
    const failures: string[] = [];

    for (const row of rows) {
      const min = faceSkinCoverageBaseline.minTrianglesByBand[row.id];
      if (row.triangleCount < min) {
        failures.push(`${row.id}: ${row.triangleCount} < ${min}`);
      }
    }

    expect(failures, formatFaceSkinCoverageAudit(rows)).toEqual([]);
  });

  it('prints face coverage audit when MUSCLE_FACE_SKIN_AUDIT=1', () => {
    if (process.env.MUSCLE_FACE_SKIN_AUDIT !== '1') return;
    const raw = auditRawFaceSkinCoverage();
    const runtime = auditRuntimeFaceSkinCoverage();
    console.warn('# Raw face skin coverage\n', formatFaceSkinCoverageAudit(raw));
    console.warn('# Runtime face skin coverage\n', formatFaceSkinCoverageAudit(runtime));
    expect(raw.length).toBeGreaterThan(0);
  });
});
