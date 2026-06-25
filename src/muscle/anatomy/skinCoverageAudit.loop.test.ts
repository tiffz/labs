import { BufferAttribute, BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { findBoundaryLoops, isInteriorSkinHoleLoop } from './skinCoverageAudit';

function quadGeometry(
  quads: Array<[number, number, number, number]>,
  positions: Array<[number, number, number]>,
): BufferGeometry {
  const geometry = new BufferGeometry();
  const verts = new Float32Array(positions.flat());
  geometry.setAttribute('position', new BufferAttribute(verts, 3));
  const indices: number[] = [];
  for (const [a, b, c, d] of quads) {
    indices.push(a, b, c, a, c, d);
  }
  geometry.setIndex(indices);
  return geometry;
}

describe('findBoundaryLoops', () => {
  it('returns only closed boundary loops', () => {
    const geometry = quadGeometry(
      [[0, 1, 2, 3]],
      [
        [0.1, 0, 0],
        [0.2, 0, 0],
        [0.2, 1, 0],
        [0.1, 1, 0],
      ],
    );
    const loops = findBoundaryLoops(geometry);
    expect(loops).toHaveLength(1);
    expect(loops[0]?.edgeCount).toBe(4);
  });

  it('flags interior holes away from sagittal plane', () => {
    const loop = {
      edgeCount: 8,
      centroid: { x: 0.12, y: 1.2, z: 0.05 },
      maxAbsX: 0.12,
      minAbsX: 0.1,
      vertexIndices: [0, 1, 2, 3],
      boundaryEdges: [[0, 1], [1, 2], [2, 3], [3, 0]] as Array<[number, number]>,
    };
    expect(isInteriorSkinHoleLoop(loop)).toBe(true);
    expect(isInteriorSkinHoleLoop({ ...loop, minAbsX: 0.02 })).toBe(false);
    expect(isInteriorSkinHoleLoop({ ...loop, edgeCount: 200 })).toBe(false);
  });
});
