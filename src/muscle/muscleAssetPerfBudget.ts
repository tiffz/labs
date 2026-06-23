/** Triangle budgets for Z-Anatomy region GLBs — enforced by validate-assets + Vitest. */
export const MUSCLE_MAX_MESH_TRIANGLES = 25_000;
/** Unified full-body skin envelope — merged Z-Anatomy body region patches. */
export const MUSCLE_MAX_SKIN_ENVELOPE_TRIANGLES = 44_000;
/** High-detail skin overlays (face, neck, palms, soles) — exported separately from body envelope. */
export const MUSCLE_SKIN_OVERLAY_CAPS: Readonly<Record<string, number>> = {
  skin_face: 12_000,
  skin_neck_shoulder: 8_000,
  skin_back: 14_000,
  skin_hand_digits: 10_000,
  skin_foot_digits: 10_000,
  eye_globes: 2_000,
};
export const MUSCLE_MAX_REGION_TRIANGLES = 80_000;
export const MUSCLE_MAX_ATLAS_REGION_TRIANGLES = 120_000;
export const MUSCLE_MAX_ATLAS_COMPLETE_TRIANGLES = 400_000;

const ATLAS_REGION_IDS = new Set(['atlas_supplement', 'atlas_head_face', 'atlas_skin']);
const ATLAS_COMPLETE_ID = 'atlas_complete';

export type MuscleManifestMesh = {
  nodeId: string;
  meshName: string;
  triangleCount: number;
};

export type MuscleManifestRegion = {
  region: string;
  meshes?: MuscleManifestMesh[];
};

export type MuscleManifest = {
  regions: Record<string, MuscleManifestRegion | undefined>;
};

export function skinMeshTriangleCap(nodeId: string): number {
  if (nodeId === 'skin_envelope') return MUSCLE_MAX_SKIN_ENVELOPE_TRIANGLES;
  const overlayCap = MUSCLE_SKIN_OVERLAY_CAPS[nodeId];
  if (overlayCap != null) return overlayCap;
  return MUSCLE_MAX_MESH_TRIANGLES;
}

export function auditMuscleManifestTriangleBudgets(manifest: MuscleManifest): string[] {
  const violations: string[] = [];

  for (const [regionId, entry] of Object.entries(manifest.regions ?? {})) {
    if (!entry?.meshes?.length) continue;

    let regionTotal = 0;
    for (const mesh of entry.meshes) {
      regionTotal += mesh.triangleCount;
      const meshCap = skinMeshTriangleCap(mesh.nodeId);
      if (mesh.triangleCount > meshCap) {
        violations.push(
          `${regionId}/${mesh.nodeId}: ${mesh.triangleCount.toLocaleString()} tris exceeds mesh cap ${meshCap.toLocaleString()}`,
        );
      }
    }

    const regionCap =
      regionId === ATLAS_COMPLETE_ID
        ? MUSCLE_MAX_ATLAS_COMPLETE_TRIANGLES
        : ATLAS_REGION_IDS.has(regionId)
          ? MUSCLE_MAX_ATLAS_REGION_TRIANGLES
          : MUSCLE_MAX_REGION_TRIANGLES;
    if (regionTotal > regionCap) {
      violations.push(
        `${regionId}: ${regionTotal.toLocaleString()} tris exceeds region cap ${regionCap.toLocaleString()}`,
      );
    }
  }

  return violations;
}
