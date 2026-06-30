import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { muscleModelsManifest as manifest } from '../types/muscleModelsManifest';
import { getNodesForRegion } from '../curriculum';
import { atlasHeadFaceNodes } from '../curriculum/nodes/atlasHeadFace';
import { atlasSupplementNodes } from '../curriculum/nodes/atlasSupplement';
import { curriculumIdsMissingFromManifest } from './muscleRegionCoverage';

const WAIVERS_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../tools/muscle-anatomy/coverage-waivers.json',
);

function waivedNodeIds(): Set<string> {
  const raw = JSON.parse(fs.readFileSync(WAIVERS_PATH, 'utf8')) as {
    waivers?: Array<{ nodeId: string }>;
  };
  return new Set((raw.waivers ?? []).map((row) => row.nodeId));
}

describe('muscleRegionCoverage', () => {
  it('waives fundamentals hip/knee capsules until Z-Anatomy export lands', () => {
    const entry = manifest.regions.fundamentals;
    const manifestIds = new Set((entry?.meshes ?? []).map((mesh) => mesh.nodeId));
    const missing = curriculumIdsMissingFromManifest('fundamentals', manifestIds);
    expect(missing).toContain('joint_hip');
    expect(missing).toContain('joint_knee');
    expect(missing).toContain('bone_ribcage');
    expect(missing).toContain('bone_spine');
    expect(missing.length).toBe(4);
  });

  it('has full manifest coverage for muscle-heavy regions', () => {
    const waived = waivedNodeIds();
    const supplementIds = new Set(
      (manifest.regions.atlas_supplement?.meshes ?? []).map((mesh) => mesh.nodeId),
    );
    for (const region of ['torso', 'shoulder_neck', 'arm', 'hand', 'leg', 'foot'] as const) {
      const entry = manifest.regions[region];
      const manifestIds = new Set((entry?.meshes ?? []).map((mesh) => mesh.nodeId));
      const missing = curriculumIdsMissingFromManifest(region, manifestIds, supplementIds).filter(
        (id) => !waived.has(id),
      );
      expect(missing).toEqual([]);
      expect(getNodesForRegion(region).length).toBeGreaterThan(0);
    }
  });

  it('has full manifest coverage for atlas supplement muscles', () => {
    const entry = manifest.regions.atlas_supplement;
    const manifestIds = new Set((entry?.meshes ?? []).map((mesh) => mesh.nodeId));
    for (const node of atlasSupplementNodes) {
      expect(manifestIds.has(node.id), `atlas supplement missing ${node.id}`).toBe(true);
    }
  });

  it('has full manifest coverage for atlas head and face structures', () => {
    const entry = manifest.regions.atlas_head_face;
    const manifestIds = new Set((entry?.meshes ?? []).map((mesh) => mesh.nodeId));
    for (const node of atlasHeadFaceNodes) {
      expect(manifestIds.has(node.id), `atlas head/face missing ${node.id}`).toBe(true);
    }
  });
});
