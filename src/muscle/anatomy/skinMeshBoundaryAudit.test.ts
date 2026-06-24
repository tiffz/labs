import { describe, expect, it } from 'vitest';
import { auditSkinMeshBoundaries, formatSkinBoundaryAudit } from './skinMeshBoundaryAudit';
import { loadSkinBoundaryBaseline } from './skinBoundaryBaseline';

describe('skinMeshBoundaryAudit', () => {
  it('does not regress skin mesh boundary edge counts', () => {
    const audit = auditSkinMeshBoundaries('public/muscle/models/atlas_skin.glb');
    const baseline = loadSkinBoundaryBaseline();
    const regressions: string[] = [];

    for (const row of audit.rows) {
      const cap = baseline.maxBoundaryEdgesByMesh[row.meshName];
      if (cap === undefined) {
        regressions.push(`${row.meshName}: no baseline (has ${row.boundaryEdgeCount} boundary edges)`);
        continue;
      }
      if (row.boundaryEdgeCount > cap) {
        regressions.push(
          `${row.meshName}: ${row.boundaryEdgeCount} boundary edges exceeds baseline ${cap}`,
        );
      }
    }

    expect(regressions, formatSkinBoundaryAudit(audit)).toEqual([]);
  });

  it('prints boundary audit when MUSCLE_SKIN_BOUNDARY_AUDIT=1', () => {
    if (process.env.MUSCLE_SKIN_BOUNDARY_AUDIT !== '1') return;
    const audit = auditSkinMeshBoundaries('public/muscle/models/atlas_skin.glb');
    console.warn(formatSkinBoundaryAudit(audit));
    expect(audit.rows.length).toBeGreaterThan(0);
  });
});
