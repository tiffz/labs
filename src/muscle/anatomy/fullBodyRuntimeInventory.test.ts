import { describe, expect, it } from 'vitest';
import { zAnatomyNamesForNodeId } from '../curriculum';
import { REQUIRED_FULL_BODY_BONE_IDS, REQUIRED_FULL_BODY_MUSCLE_IDS } from './requiredMeshIds';
import {
  buildFullBodyRuntimeMeshInventory,
  collectSkinOverlayNodeIds,
  formatRuntimeInventorySummary,
} from './fullBodyRuntimeInventory';

describe('fullBodyRuntimeInventory', () => {
  it('includes core fundamentals bones after merge simulation', () => {
    const inventory = buildFullBodyRuntimeMeshInventory();
    for (const boneId of REQUIRED_FULL_BODY_BONE_IDS) {
      expect(inventory.has(boneId), `${boneId} missing — is fundamentals.glb in Full body merge?`).toBe(
        true,
      );
    }
  });

  it('includes required landmark muscles in full-body runtime inventory', () => {
    const inventory = buildFullBodyRuntimeMeshInventory();
    for (const muscleId of REQUIRED_FULL_BODY_MUSCLE_IDS) {
      expect(
        inventory.has(muscleId),
        `${muscleId} missing — check atlas_complete / regional GLB merge`,
      ).toBe(true);
    }
  });

  it('maps all twelve ribs into bone_ribcage for torso export', () => {
    expect(zAnatomyNamesForNodeId('bone_ribcage')).toHaveLength(12);
  });

  it('maps five metatarsals into bone_metatarsals for foot export', () => {
    expect(zAnatomyNamesForNodeId('bone_metatarsals')).toHaveLength(5);
  });

  it('resolves all required skin overlay ids from atlas_skin.glb', () => {
    const skin = collectSkinOverlayNodeIds();
    for (const id of ['skin_envelope', 'eye_globes']) {
      expect(skin.has(id), id).toBe(true);
    }
  });

  it('prints inventory summary when MUSCLE_RUNTIME_INVENTORY=1', () => {
    if (process.env.MUSCLE_RUNTIME_INVENTORY !== '1') return;
    const inventory = buildFullBodyRuntimeMeshInventory();
    console.warn(formatRuntimeInventorySummary(inventory));
    expect(inventory.size).toBeGreaterThan(100);
  });
});
