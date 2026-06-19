import { BoxGeometry, Group, Mesh, Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { computeAnatomyGroupTransform, extractGlbMeshes } from './extractGlbMeshes';

vi.mock('./applyMeshBvh', () => ({
  prepareAnatomyGeometry: (geometry: BoxGeometry) => geometry,
}));

describe('extractGlbMeshes', () => {
  it('bakes parent transforms into mesh geometry', () => {
    const parent = new Group();
    parent.position.set(2, 0, 0);

    const child = new Mesh(new BoxGeometry(1, 1, 1));
    child.name = 'muscle_pectoralis_major';
    child.position.set(1, 0, 0);
    parent.add(child);

    const root = new Object3D();
    root.add(parent);
    root.updateMatrixWorld(true);

    const [mesh] = extractGlbMeshes(root);
    expect(mesh?.name).toBe('muscle_pectoralis_major');
    expect(mesh?.position.x).toBe(0);
    mesh?.geometry.computeBoundingBox();
    expect(mesh?.geometry.boundingBox?.min.x).toBeCloseTo(2.5);
    expect(mesh?.geometry.boundingBox?.max.x).toBeCloseTo(3.5);
  });

  it('clones source geometry so GLTF cache is not mutated', () => {
    const child = new Mesh(new BoxGeometry(1, 1, 1));
    child.name = 'bone_sternum';
    const root = new Object3D();
    root.add(child);
    const sourceGeometry = child.geometry;

    const [mesh] = extractGlbMeshes(root);

    expect(mesh?.geometry).not.toBe(sourceGeometry);
  });

  it('skips meshes that fail the include predicate', () => {
    const included = new Mesh(new BoxGeometry(1, 1, 1));
    included.name = 'bone_sternum';
    const skipped = new Mesh(new BoxGeometry(1, 1, 1));
    skipped.name = 'Left parietal bone';
    const root = new Object3D();
    root.add(included, skipped);

    const meshes = extractGlbMeshes(root, (name) => name.startsWith('bone_'));

    expect(meshes.map((mesh) => mesh.name)).toEqual(['bone_sternum']);
  });
});

describe('computeAnatomyGroupTransform', () => {
  it('scales and grounds anatomy meshes in the staging volume', () => {
    const mesh = new Mesh(new BoxGeometry(1, 2, 1));
    mesh.position.set(0, 1, 0);
    const layout = computeAnatomyGroupTransform([mesh]);
    expect(layout.scale).toBeCloseTo(1.75 / 2);
    expect(layout.position[1]).toBeCloseTo(0);
  });
});
