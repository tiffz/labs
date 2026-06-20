import { BoxGeometry, Mesh } from 'three';
import { describe, expect, it } from 'vitest';

import { dedupeMeshesPreferDetail, meshTriangleCount } from './meshMergeUtils';

describe('meshMergeUtils', () => {
  it('prefers the higher triangle-count mesh for the same node id', () => {
    const coarse = new Mesh(new BoxGeometry(1, 1, 1, 1, 1, 1));
    coarse.name = 'muscle_pectoralis_major';
    const fine = new Mesh(new BoxGeometry(1, 1, 1, 8, 8, 8));
    fine.name = 'muscle_pectoralis_major';

    const [mesh] = dedupeMeshesPreferDetail([coarse, fine]);

    expect(mesh).toBe(fine);
    expect(meshTriangleCount(mesh)).toBeGreaterThan(meshTriangleCount(coarse));
  });
});
