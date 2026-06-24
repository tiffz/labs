import { describe, expect, it } from 'vitest';
import { auditGlbMeshResolution } from './glbFileAudit';

describe('glbFileAudit', () => {
  it('resolves all required skin overlays from atlas_skin.glb mesh names', () => {
    const audit = auditGlbMeshResolution('public/muscle/models/atlas_skin.glb', [
      'skin_envelope',
      'eye_globes',
    ]);
    expect(audit.missingNodeIds, audit.unmappedMeshNames.join(', ')).toEqual([]);
    expect(audit.unmappedMeshNames, audit.meshNames.join(', ')).toEqual([]);
  });

  it('resolves glute supplement meshes from atlas_supplement.glb', () => {
    const audit = auditGlbMeshResolution('public/muscle/models/atlas_supplement.glb', [
      'muscle_gluteus_maximus',
      'muscle_gluteus_medius',
      'muscle_gluteus_minimus',
    ]);
    expect(audit.missingNodeIds).toEqual([]);
  });
});
