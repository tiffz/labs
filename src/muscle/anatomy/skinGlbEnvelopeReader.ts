import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BufferAttribute, BufferGeometry } from 'three';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const SKIN_GLB_PATH = 'public/muscle/models/atlas_skin.glb';

type GlbDoc = {
  meshes?: Array<{ name?: string; primitives?: Array<{ attributes?: { POSITION?: number }; indices?: number }> }>;
  accessors?: Array<{
    bufferView?: number;
    byteOffset?: number;
    count?: number;
  }>;
  bufferViews?: Array<{ byteOffset?: number }>;
};

/** Read raw skin_envelope geometry from atlas_skin.glb (before runtime align/clip). */
export function readGlbSkinEnvelopeGeometry(glbRelativePath = SKIN_GLB_PATH): BufferGeometry {
  const glbPath = path.join(REPO_ROOT, glbRelativePath);
  const file = fs.readFileSync(glbPath);
  const jsonLength = file.readUInt32LE(12);
  const doc = JSON.parse(file.slice(20, 20 + jsonLength).toString()) as GlbDoc;

  const mesh = doc.meshes?.find((entry) => entry.name === 'skin_envelope') ?? doc.meshes?.[0];
  const prim = mesh?.primitives?.[0];
  if (prim?.attributes?.POSITION === undefined) {
    throw new Error('skin_envelope POSITION missing from atlas_skin.glb');
  }

  let offset = 12 + 8 + jsonLength;
  offset = (offset + 3) & ~3;
  const binStart = offset + 8;
  const bin = file.slice(binStart, binStart + file.readUInt32LE(offset));

  const posAcc = doc.accessors![prim.attributes.POSITION]!;
  const posCount = posAcc.count;
  if (posCount === undefined) {
    throw new Error('skin_envelope POSITION accessor missing count');
  }
  const posView = doc.bufferViews![posAcc.bufferView!]!;
  const posOff = (posView.byteOffset ?? 0) + (posAcc.byteOffset ?? 0);
  const positions = new Float32Array(posCount * 3);
  for (let i = 0; i < posCount; i += 1) {
    positions[i * 3] = bin.readFloatLE(posOff + i * 12);
    positions[i * 3 + 1] = bin.readFloatLE(posOff + i * 12 + 4);
    positions[i * 3 + 2] = bin.readFloatLE(posOff + i * 12 + 8);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));

  if (prim.indices !== undefined) {
    const idxAcc = doc.accessors![prim.indices]!;
    const idxCount = idxAcc.count;
    if (idxCount === undefined) {
      throw new Error('skin_envelope index accessor missing count');
    }
    const idxView = doc.bufferViews![idxAcc.bufferView!]!;
    const idxOff = (idxView.byteOffset ?? 0) + (idxAcc.byteOffset ?? 0);
    const indices = new Uint32Array(idxCount);
    for (let i = 0; i < idxCount; i += 1) {
      indices[i] = bin.readUInt16LE(idxOff + i * 2);
    }
    geometry.setIndex(new BufferAttribute(indices, 1));
  }

  return geometry;
}
