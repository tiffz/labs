/** Triangle budgets for Z-Anatomy region GLBs — enforced by validate-assets + Vitest. */
export const MUSCLE_MAX_MESH_TRIANGLES = 25_000;
export const MUSCLE_MAX_REGION_TRIANGLES = 80_000;

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

export function auditMuscleManifestTriangleBudgets(manifest: MuscleManifest): string[] {
  const violations: string[] = [];

  for (const [regionId, entry] of Object.entries(manifest.regions ?? {})) {
    if (!entry?.meshes?.length) continue;

    let regionTotal = 0;
    for (const mesh of entry.meshes) {
      regionTotal += mesh.triangleCount;
      if (mesh.triangleCount > MUSCLE_MAX_MESH_TRIANGLES) {
        violations.push(
          `${regionId}/${mesh.nodeId}: ${mesh.triangleCount.toLocaleString()} tris exceeds mesh cap ${MUSCLE_MAX_MESH_TRIANGLES.toLocaleString()}`,
        );
      }
    }

    if (regionTotal > MUSCLE_MAX_REGION_TRIANGLES) {
      violations.push(
        `${regionId}: ${regionTotal.toLocaleString()} tris exceeds region cap ${MUSCLE_MAX_REGION_TRIANGLES.toLocaleString()}`,
      );
    }
  }

  return violations;
}
