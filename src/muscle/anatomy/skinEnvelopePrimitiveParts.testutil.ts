import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BufferAttribute, BufferGeometry } from 'three';
import { SKIN_GLB_PATH } from './skinGlbEnvelopeReader';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Shared helper — raw glTF primitive parts from atlas_skin.glb (no runtime seal). */
export function readSkinEnvelopePrimitiveParts(): BufferGeometry[] {
  const glbPath = path.join(REPO_ROOT, SKIN_GLB_PATH);
  const file = fs.readFileSync(glbPath);
  const jsonLength = file.readUInt32LE(12);
  const doc = JSON.parse(file.slice(20, 20 + jsonLength).toString()) as {
    meshes?: Array<{ name?: string; primitives?: Array<{ attributes?: { POSITION?: number }; indices?: number }> }>;
    accessors?: Array<{ bufferView?: number; byteOffset?: number; count?: number }>;
    bufferViews?: Array<{ byteOffset?: number }>;
  };
  let offset = 12 + 8 + jsonLength;
  offset = (offset + 3) & ~3;
  const binStart = offset + 8;
  const bin = file.slice(binStart, binStart + file.readUInt32LE(offset));
  const mesh = doc.meshes?.find((entry) => entry.name === 'skin_envelope');
  const primitives = mesh?.primitives ?? [];

  return primitives.map((prim) => {
    const posAcc = doc.accessors![prim.attributes!.POSITION!]!;
    const posView = doc.bufferViews![posAcc.bufferView!]!;
    const posOff = (posView.byteOffset ?? 0) + (posAcc.byteOffset ?? 0);
    const positions = new Float32Array(posAcc.count! * 3);
    for (let i = 0; i < posAcc.count!; i += 1) {
      positions[i * 3] = bin.readFloatLE(posOff + i * 12);
      positions[i * 3 + 1] = bin.readFloatLE(posOff + i * 12 + 4);
      positions[i * 3 + 2] = bin.readFloatLE(posOff + i * 12 + 8);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    if (prim.indices !== undefined) {
      const idxAcc = doc.accessors![prim.indices]!;
      const idxView = doc.bufferViews![idxAcc.bufferView!]!;
      const idxOff = (idxView.byteOffset ?? 0) + (idxAcc.byteOffset ?? 0);
      const indices = new Uint32Array(idxAcc.count!);
      for (let i = 0; i < idxAcc.count!; i += 1) {
        indices[i] = bin.readUInt16LE(idxOff + i * 2);
      }
      geometry.setIndex(new BufferAttribute(indices, 1));
    }
    return geometry;
  });
}
