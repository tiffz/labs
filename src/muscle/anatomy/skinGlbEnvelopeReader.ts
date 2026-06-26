import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BufferAttribute, BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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

function readGlbBinary(glbRelativePath: string): { doc: GlbDoc; bin: Buffer } {
  const glbPath = path.join(REPO_ROOT, glbRelativePath);
  const file = fs.readFileSync(glbPath);
  const jsonLength = file.readUInt32LE(12);
  const doc = JSON.parse(file.slice(20, 20 + jsonLength).toString()) as GlbDoc;

  let offset = 12 + 8 + jsonLength;
  offset = (offset + 3) & ~3;
  const binStart = offset + 8;
  const bin = file.slice(binStart, binStart + file.readUInt32LE(offset));

  return { doc, bin };
}

function readPrimitiveGeometry(
  doc: GlbDoc,
  bin: Buffer,
  prim: { attributes?: { POSITION?: number }; indices?: number },
): BufferGeometry {
  if (prim.attributes?.POSITION === undefined) {
    throw new Error('POSITION missing from atlas_skin.glb primitive');
  }

  const posAcc = doc.accessors![prim.attributes.POSITION]!;
  const posCount = posAcc.count;
  if (posCount === undefined) {
    throw new Error('POSITION accessor missing count');
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
      throw new Error('index accessor missing count');
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

function readNamedMeshGeometry(
  doc: GlbDoc,
  bin: Buffer,
  meshName: string,
  glbRelativePath: string,
): BufferGeometry {
  const mesh = doc.meshes?.find((entry) => entry.name === meshName);
  const primitives = mesh?.primitives ?? [];
  if (primitives.length === 0) {
    throw new Error(`${meshName} missing from ${glbRelativePath}`);
  }

  const parts = primitives.map((prim) => readPrimitiveGeometry(doc, bin, prim));
  if (parts.length === 1) return parts[0]!;

  const merged = mergeGeometries(parts, false);
  if (!merged) {
    throw new Error(`Failed to merge ${meshName} glTF primitives`);
  }
  return merged;
}

/** Unified body skin shell (includes joined auricular overlay from export). */
export function readGlbSkinEnvelopeGeometry(glbRelativePath = SKIN_GLB_PATH): BufferGeometry {
  const { doc, bin } = readGlbBinary(glbRelativePath);
  return readNamedMeshGeometry(doc, bin, 'skin_envelope', glbRelativePath);
}
