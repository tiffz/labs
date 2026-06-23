import { BoxGeometry, Mesh } from 'three';
import { describe, expect, it } from 'vitest';

import { dedupeMeshesPreferDetail, mergeFullBodyMeshes, meshTriangleCount } from './meshMergeUtils';

describe('meshMergeUtils', () => {
  it('prefers a plausible mesh over a high-poly origin duplicate', () => {
    const misplaced = new Mesh(new BoxGeometry(0.04, 0.06, 0.02, 8, 8, 8));
    misplaced.name = 'muscle_gluteus_maximus';

    const placed = new Mesh(new BoxGeometry(0.4, 0.6, 0.2, 4, 4, 4));
    placed.name = 'muscle_gluteus_maximus';
    placed.position.set(0, 0.9, 0);
    placed.updateMatrixWorld();

    const [mesh] = dedupeMeshesPreferDetail([misplaced, placed]);

    expect(mesh).toBe(placed);
    expect(meshTriangleCount(mesh)).toBeLessThan(meshTriangleCount(misplaced));
  });

  it('prefers later merge groups over decimated atlas duplicates', () => {
    const atlas = new Mesh(new BoxGeometry(0.4, 0.6, 0.2, 8, 8, 8));
    atlas.name = 'muscle_gluteus_maximus';
    atlas.geometry.translate(0, 0.9, 0);

    const supplement = new Mesh(new BoxGeometry(0.45, 0.65, 0.22, 4, 4, 4));
    supplement.name = 'muscle_gluteus_maximus';
    supplement.geometry.translate(0, 0.9, 0);

    const [mesh] = mergeFullBodyMeshes([atlas], [], [supplement], []);

    expect(mesh).toBe(supplement);
  });
});
