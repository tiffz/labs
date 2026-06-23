import { describe, expect, it } from 'vitest';
import { muscleModelsManifest as manifest } from '../types/muscleModelsManifest';
import { getNodesForRegion } from '../curriculum';
import { atlasHeadFaceNodes } from '../curriculum/nodes/atlasHeadFace';
import { atlasSupplementNodes } from '../curriculum/nodes/atlasSupplement';
import { curriculumIdsMissingFromManifest } from './muscleRegionCoverage';

describe('muscleRegionCoverage', () => {
  it('waives fundamentals hip/knee capsules until Z-Anatomy export lands', () => {
    const entry = manifest.regions.fundamentals;
    const manifestIds = new Set((entry?.meshes ?? []).map((mesh) => mesh.nodeId));
    const missing = curriculumIdsMissingFromManifest('fundamentals', manifestIds);
    expect(missing).toContain('joint_hip');
    expect(missing).toContain('joint_knee');
    expect(missing.length).toBe(2);
  });

  it('has full manifest coverage for muscle-heavy regions', () => {
    for (const region of ['torso', 'shoulder_neck', 'arm', 'hand', 'leg', 'foot'] as const) {
      const entry = manifest.regions[region];
      const manifestIds = new Set((entry?.meshes ?? []).map((mesh) => mesh.nodeId));
      const curriculumIds = getNodesForRegion(region).map((node) => node.id);
      expect(curriculumIdsMissingFromManifest(region, manifestIds)).toEqual([]);
      expect(curriculumIds.length).toBeGreaterThan(0);
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
