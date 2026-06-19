import { describe, expect, it } from 'vitest';
import manifest from '../../../public/muscle/models/manifest.json';
import { getNodesForRegion } from '../curriculum';
import { curriculumIdsMissingFromManifest } from './muscleRegionCoverage';

describe('muscleRegionCoverage', () => {
  it('reports fundamentals joints missing from manifest (procedural fill expected)', () => {
    const entry = manifest.regions.fundamentals;
    const manifestIds = new Set((entry?.meshes ?? []).map((mesh) => mesh.nodeId));
    const missing = curriculumIdsMissingFromManifest('fundamentals', manifestIds);
    expect(missing).toContain('joint_hip');
    expect(missing).toContain('joint_knee');
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
});
