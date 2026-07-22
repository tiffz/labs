import * as THREE from 'three';
import { BoxGeometry, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { getNodesForRegion } from '../../curriculum';
import { pickStructureFromIntersections } from './pickStructureFromIntersections';

function hit(mesh: Mesh, distance: number): THREE.Intersection {
  return { object: mesh, distance, point: new THREE.Vector3() };
}

describe('pickStructureFromIntersections', () => {
  it('prefers superficial muscles over deeper bones along the same ray', () => {
    const muscle = getNodesForRegion('torso').find((node) => node.type === 'muscle' && node.layerDepth === 0);
    const bone = getNodesForRegion('fundamentals').find((node) => node.type === 'bone');
    expect(muscle).toBeTruthy();
    expect(bone).toBeTruthy();
    if (!muscle || !bone) return;

    const muscleMesh = new Mesh(new BoxGeometry(1, 1, 1));
    muscleMesh.name = muscle.id;
    const boneMesh = new Mesh(new BoxGeometry(1, 1, 1));
    boneMesh.name = bone.id;

    const picked = pickStructureFromIntersections(
      [hit(boneMesh, 1), hit(muscleMesh, 2)],
      0,
    );
    expect(picked).toBe(muscle.id);
  });

  it('ignores atlas mirror fill meshes', () => {
    const muscle = getNodesForRegion('torso').find((node) => node.type === 'muscle');
    expect(muscle).toBeTruthy();
    if (!muscle) return;

    const mirrorMesh = new Mesh(new BoxGeometry(1, 1, 1));
    mirrorMesh.name = `${muscle.id}__atlas_mirror`;

    const picked = pickStructureFromIntersections([hit(mirrorMesh, 0.5)], 0);
    expect(picked).toBeUndefined();
  });
});
