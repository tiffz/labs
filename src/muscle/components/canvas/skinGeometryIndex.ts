import { BufferAttribute, BufferGeometry } from 'three';

/** WebGL needs Uint32 index buffers when index count or max vertex id exceeds 16-bit. */
export function assignBufferGeometryIndex(geometry: BufferGeometry, indices: readonly number[]): void {
  if (indices.length === 0) {
    geometry.setIndex(null);
    return;
  }

  let maxIndex = 0;
  for (const index of indices) {
    if (index > maxIndex) maxIndex = index;
  }

  const needsUint32 = maxIndex > 65535 || indices.length > 65535;
  if (needsUint32) {
    geometry.setIndex(new BufferAttribute(new Uint32Array(indices), 1));
    return;
  }

  geometry.setIndex(new BufferAttribute(new Uint16Array(indices), 1));
}
