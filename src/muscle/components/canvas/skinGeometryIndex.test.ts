import { BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { assignBufferGeometryIndex } from './skinGeometryIndex';

describe('assignBufferGeometryIndex', () => {
  it('uses Uint32 when index count exceeds 16-bit element limit', () => {
    const geometry = new BufferGeometry();
    const indices = Array.from({ length: 70_000 }, (_, i) => i % 1000);
    assignBufferGeometryIndex(geometry, indices);
    const array = geometry.getIndex()?.array;
    expect(array).toBeInstanceOf(Uint32Array);
    expect(array?.length).toBe(70_000);
  });

  it('uses Uint16 for small skin clips', () => {
    const geometry = new BufferGeometry();
    assignBufferGeometryIndex(geometry, [0, 1, 2, 1, 2, 3]);
    expect(geometry.getIndex()?.array).toBeInstanceOf(Uint16Array);
  });
});
