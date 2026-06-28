import { describe, expect, it } from 'vitest';
import { auditGlbMeshResolution } from './glbFileAudit';

describe('glbFileAudit', () => {
  it('resolves glute supplement meshes from atlas_supplement.glb', () => {
    const audit = auditGlbMeshResolution('public/muscle/models/atlas_supplement.glb', [
      'muscle_gluteus_maximus',
      'muscle_gluteus_medius',
      'muscle_gluteus_minimus',
    ]);
    expect(audit.missingNodeIds).toEqual([]);
  });
});
