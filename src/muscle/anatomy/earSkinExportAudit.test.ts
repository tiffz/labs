import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Z-Anatomy .r auricular skin surfaces — must all appear in export predicates. */
const Z_ANATOMY_EAR_SKIN_NAMES = [
  'Auricular region.r',
  'Helix.r',
  'Antihelix.r',
  'Crura of antihelix.r',
  'Tragus.r',
  'Scapha.r',
  'Concha of auricle.r',
  'Auricular tubercle.r',
  'Lobule of auricle.r',
  'Apex of auricle.r',
  'Anterior notch of auricle.r',
  'Posterior auricular groove.r',
  'Mastoid region.r',
] as const;

describe('earSkinExportAudit', () => {
  it('maps every Z-Anatomy auricular skin surface to skin_ear export predicates', () => {
    const exportSource = fs.readFileSync(
      path.join(REPO_ROOT, 'tools/muscle-anatomy/export_region_glb.py'),
      'utf8',
    );
    expect(exportSource).toMatch(/SKIN_OVERLAY_MESH_IDS.*skin_ear/);
    expect(exportSource).toMatch(/_EAR_OVERLAY_BASES/);
    expect(exportSource).toMatch(/_EAR_BACKING_BASES/);
    expect(exportSource).toMatch(/_is_skin_ear_backing_patch/);
    expect(exportSource).toMatch(/finalize_skin_ear_shell/);
    expect(exportSource).not.toMatch(/fill_skin_ear_holes\(unified\)/);

    for (const name of Z_ANATOMY_EAR_SKIN_NAMES) {
      if (name === 'Auricular region.r') {
        expect(exportSource).toMatch(/auricular region/);
        continue;
      }
      const base = name.replace('.r', '');
      expect(exportSource, `missing ear base ${base}`).toContain(`'${base}'`);
    }
  });

  it('joins skin_ear overlay into skin_envelope at export (no separate GLB mesh)', () => {
    const exportSource = fs.readFileSync(
      path.join(REPO_ROOT, 'tools/muscle-anatomy/export_region_glb.py'),
      'utf8',
    );
    expect(exportSource).toMatch(/join_ear_overlay_to_envelope/);
    expect(exportSource).toMatch(/weld_skin_ear_junction/);

    const manifest = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'public/muscle/models/manifest.json'), 'utf8'),
    ) as { regions?: { atlas_skin?: { meshes?: Array<{ nodeId: string; triangleCount: number }> } } };
    const meshes = manifest.regions?.atlas_skin?.meshes ?? [];
    expect(meshes.some((mesh) => mesh.nodeId === 'skin_ear')).toBe(false);
    const envelope = meshes.find((mesh) => mesh.nodeId === 'skin_envelope');
    expect(envelope, 'skin_envelope missing — re-export atlas_skin').toBeDefined();
    expect(envelope!.triangleCount, 'skin_envelope includes joined ear').toBeGreaterThan(35_000);
  });
});
