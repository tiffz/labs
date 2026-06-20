import * as THREE from 'three';
import { BoxGeometry, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { createAtlasMirrorMeshes } from './mirrorAnatomyMeshes';

describe('createAtlasMirrorMeshes', () => {
  it('mirrors geometry across the body midline', () => {
    const mesh = new Mesh(new BoxGeometry(0.2, 1, 0.2));
    mesh.geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0.5, 1, 0));
    const [mirrored] = createAtlasMirrorMeshes([mesh]);
    mirrored?.geometry.computeBoundingBox();
    expect(mirrored?.geometry.boundingBox?.min.x).toBeCloseTo(-0.6, 1);
    expect(mirrored?.geometry.boundingBox?.max.x).toBeCloseTo(-0.4, 1);
    expect(mirrored?.userData.atlasMirror).toBe(true);
  });
});
