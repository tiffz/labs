import { describe, expect, it } from 'vitest';
import { zAnatomyNamesForNodeId } from '../curriculum';
import { REQUIRED_FULL_BODY_BONE_IDS, REQUIRED_FULL_BODY_MUSCLE_IDS } from './requiredMeshIds';
import {
  buildFullBodyRuntimeMeshInventory,
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

  it('maps all twelve ribs plus seven costal cartilages into bone_ribcage for torso export', () => {
    const names = zAnatomyNamesForNodeId('bone_ribcage');
    // 12 ribs close the cage at the back/sides; the 7 costal cartilages close it at the front
    // (rib → sternum bridge) so the thorax reads as complete instead of open. See ADR 0018.
    for (let n = 1; n <= 12; n += 1) {
      expect(names.some((name) => /rib\.r$/i.test(name))).toBe(true);
    }
    expect(names.filter((name) => /costal cartilage\.r$/i.test(name))).toHaveLength(7);
    expect(names).toHaveLength(19);
  });

  it('maps five metatarsals into bone_metatarsals for foot export', () => {
    expect(zAnatomyNamesForNodeId('bone_metatarsals')).toHaveLength(5);
  });

  it('prints inventory summary when MUSCLE_RUNTIME_INVENTORY=1', () => {
    if (process.env.MUSCLE_RUNTIME_INVENTORY !== '1') return;
    const inventory = buildFullBodyRuntimeMeshInventory();
    console.warn(formatRuntimeInventorySummary(inventory));
    expect(inventory.size).toBeGreaterThan(100);
  });
});
