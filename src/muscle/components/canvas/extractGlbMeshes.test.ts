import { BoxGeometry, Group, Mesh, Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { computeAnatomyGroupTransform, computeStageOrbitTarget, extractGlbMeshes, isPlausibleAnatomyMesh } from './extractGlbMeshes';

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

  it('skips origin-placed degenerate meshes', () => {
    const orphan = new Mesh(new BoxGeometry(0.04, 0.06, 0.02));
    orphan.name = 'atlas_tendinous_arch_of_levator_ani_r_dc58d9f6';
    orphan.position.set(0, 0, 0);
    const valid = new Mesh(new BoxGeometry(1, 1, 1));
    valid.name = 'muscle_pectoralis_major';
    valid.position.set(0, 1, 0);
    const root = new Object3D();
    root.add(orphan, valid);
    root.updateMatrixWorld(true);

    const meshes = extractGlbMeshes(root);
    expect(meshes.map((mesh) => mesh.name)).toEqual(['muscle_pectoralis_major']);
  });

  it('extracts skin overlay meshes by mesh name', () => {
    const skinEnvelope = new Mesh(new BoxGeometry(1, 1, 1));
    skinEnvelope.name = 'skin_envelope';
    skinEnvelope.position.set(0, 1.5, 0);
    const skinDigits = new Mesh(new BoxGeometry(1, 1, 1));
    skinDigits.name = 'skin_hand_digits';
    skinDigits.position.set(0, 0.8, 0);
    const muscle = new Mesh(new BoxGeometry(1, 1, 1));
    muscle.name = 'muscle_pectoralis_major';
    muscle.position.set(0, 1, 0);
    const root = new Object3D();
    root.add(skinEnvelope, skinDigits, muscle);
    root.updateMatrixWorld(true);

    const meshes = extractGlbMeshes(root, (name) => name.startsWith('skin_'));

    expect(meshes.map((mesh) => mesh.name).sort()).toEqual(['skin_envelope', 'skin_hand_digits']);
  });

  it('merges multi-material submeshes that share a curriculum node id', () => {
    const parent = new Group();
    parent.name = 'bone_pelvis';
    parent.userData.nodeId = 'bone_pelvis';

    const a = new Mesh(new BoxGeometry(1, 1, 1));
    a.name = 'Generated_Mesh_From_X3D311';
    const b = new Mesh(new BoxGeometry(1, 1, 1));
    b.name = 'Generated_Mesh_From_X3D311_1';
    parent.add(a, b);

    const root = new Object3D();
    root.add(parent);

    const meshes = extractGlbMeshes(root);
    expect(meshes.map((mesh) => mesh.name)).toEqual(['bone_pelvis']);
  });
});

describe('isPlausibleAnatomyMesh', () => {
  it('rejects collapsed origin garbage', () => {
    const geometry = new BoxGeometry(0.04, 0.06, 0.02);
    expect(isPlausibleAnatomyMesh(geometry)).toBe(false);
  });

  it('rejects default cube-sized meshes at the origin', () => {
    const geometry = new BoxGeometry(2, 2, 2);
    expect(isPlausibleAnatomyMesh(geometry)).toBe(false);
  });

  it('accepts anatomy-sized meshes away from the origin', () => {
    const geometry = new BoxGeometry(0.4, 0.6, 0.2);
    geometry.translate(0, 0.9, 0);
    expect(isPlausibleAnatomyMesh(geometry)).toBe(true);
  });
});

describe('computeAnatomyGroupTransform', () => {
  it('aligns sagittal split exports to +X without centering across the midline', () => {
    const mesh = new Mesh(new BoxGeometry(0.1, 1, 0.1));
    mesh.geometry.translate(-0.25, 0.5, 0);
    const layout = computeAnatomyGroupTransform([mesh], { sagittalSplit: true });
    mesh.geometry.computeBoundingBox();
    const staged = mesh.geometry.boundingBox!.clone();
    staged.min.x *= layout.scale;
    staged.max.x *= layout.scale;
    staged.min.x += layout.position[0];
    staged.max.x += layout.position[0];
    expect(staged.min.x).toBeCloseTo(0, 3);
    expect(staged.max.x).toBeGreaterThan(0.05);
  });

  it('scales and grounds anatomy meshes in the staging volume', () => {
    const mesh = new Mesh(new BoxGeometry(1, 2, 1));
    mesh.position.set(0, 1, 0);
    const layout = computeAnatomyGroupTransform([mesh]);
    expect(layout.scale).toBeCloseTo(1.75 / 2);
    expect(layout.position[1]).toBeCloseTo(0);
  });
});

describe('computeStageOrbitTarget', () => {
  it('returns bbox center after staging transform', () => {
    const mesh = new Mesh(new BoxGeometry(1, 2, 1));
    mesh.position.set(0, 1, 0);
    mesh.updateMatrixWorld();
    const geometry = mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);
    const baked = new Mesh(geometry);
    const layout = computeAnatomyGroupTransform([baked]);
    const target = computeStageOrbitTarget([baked], layout);
    expect(target[1]).toBeCloseTo(0.875, 1);
  });
});
