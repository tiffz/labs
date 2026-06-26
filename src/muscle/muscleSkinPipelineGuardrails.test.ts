import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readRepo(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

describe('muscle skin pipeline guardrails', () => {
  it('never translates straddling skin by −min.x (exploded staging columns)', () => {
    const source = readRepo('src/muscle/components/canvas/alignSkinEnvelopeGeometry.ts');
    expect(source).not.toMatch(/\.translate\s*\(/);
    expect(source).not.toMatch(/translate\s*\(\s*-?\s*box\.min\.x/);
    expect(source).toMatch(/flipGeometryWinding/);
  });

  it('keeps study skin material uniform (no alphaTest punch-through on curved pecs)', () => {
    const source = readRepo('src/muscle/components/canvas/SkinEnvelopeLayer.tsx');
    expect(source).toMatch(/material\.alphaTest\s*=\s*0/);
    expect(source).not.toMatch(/alphaTest\s*=\s*isStudy\s*\?\s*0\.0[1-9]/);
    expect(source).toMatch(/material\.polygonOffset\s*=\s*!isStudy/);
    expect(source).toMatch(/polygonOffsetFactor\s*=\s*isStudy\s*\?\s*0\s*:\s*-1/);
  });

  it('preserves midline face and anterior neck bands during sagittal clip', () => {
    const clipSource = readRepo('src/muscle/components/canvas/clipSkinToStudyHalf.ts');
    expect(clipSource).toMatch(/preserveMidlineFace/);
    expect(clipSource).toMatch(/preserveMidlineAnteriorNeck/);
    expect(clipSource).toMatch(/isMidlineFaceTriangle/);
    expect(clipSource).toMatch(/isMidlineAnteriorNeckTriangle/);

    const layerSource = readRepo('src/muscle/components/canvas/SkinEnvelopeLayer.tsx');
    expect(layerSource).toMatch(/clipSkinGeometryForStudyHalf/);
    expect(layerSource).toMatch(/clipSkinGeometryForReferenceHalf/);
    expect(layerSource).not.toMatch(/appendMidlineThroatPlug/);

    const halfClipSource = readRepo('src/muscle/components/canvas/skinHalfClipOptions.ts');
    expect(halfClipSource).toMatch(/preserveMidlineFace:\s*true/);
    expect(halfClipSource).toMatch(/minVertexX:\s*0/);
  });

  it('fixes midline throat holes at export time — no runtime procedural skin patches', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'src/muscle/components/canvas/appendMidlineThroatPlug.ts'))).toBe(
      false,
    );
    const exportSource = readRepo('tools/muscle-anatomy/export_region_glb.py');
    expect(exportSource).toMatch(/Helix/);
    expect(exportSource).toMatch(/Antihelix/);
    expect(exportSource).toMatch(/Crura of antihelix/);
    expect(exportSource).toMatch(/fill_skin_throat_holes/);
    expect(exportSource).toMatch(/weld_skin_throat_midline_band/);
    expect(exportSource).toMatch(/finalize_skin_ear_shell/);
    expect(exportSource).toMatch(/Lobule of auricle/);
    expect(exportSource).toMatch(/join_ear_overlay_to_envelope/);
    expect(exportSource).toMatch(/weld_skin_ear_junction/);
  });

  it('requires muscle skin pipeline cursor rule', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, '.cursor/rules/muscle-skin-pipeline.mdc'))).toBe(true);
  });

  it('routes orphan skin fillers and neck bridge patches in export script', () => {
    const exportSource = readRepo('tools/muscle-anatomy/export_region_glb.py');
    expect(exportSource).toMatch(/_orphan_skin_centroid_band/);
    expect(exportSource).toMatch(/skin_head_neck/);
    expect(exportSource).toMatch(/Lesser supraclavicular fossa/);
    expect(exportSource).toMatch(/Submental region/);
    expect(exportSource).toMatch(/Deltopectoral triangle/);
    expect(exportSource).toMatch(/merge_dist=0\.0025/);
    expect(exportSource).toMatch(/if _is_neck_bridge_skin_patch\(obj\):\s*\n\s*return True/);
  });

  it('requires face skin coverage and boundary edge audits', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'src/muscle/anatomy/faceSkinCoverageAudit.test.ts'))).toBe(true);
    expect(fs.existsSync(path.join(REPO_ROOT, 'src/muscle/anatomy/skinCoverageAudit.test.ts'))).toBe(true);
    expect(fs.existsSync(path.join(REPO_ROOT, 'src/muscle/anatomy/skinSeamGapAudit.test.ts'))).toBe(true);
    expect(fs.existsSync(path.join(REPO_ROOT, 'src/muscle/anatomy/earSkinExportAudit.test.ts'))).toBe(true);
    expect(fs.existsSync(path.join(REPO_ROOT, 'src/muscle/components/canvas/skinHalfClipOptions.ts'))).toBe(true);
  });
});
