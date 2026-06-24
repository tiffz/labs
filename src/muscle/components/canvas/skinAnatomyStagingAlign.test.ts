import fs from 'node:fs';
import path from 'node:path';
import { BufferAttribute, BufferGeometry, BoxGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { alignAnatomyMeshToStudyHalf, alignSkinEnvelopeToStudyHalf } from './alignSkinEnvelopeGeometry';

const SKIN_GLB = path.resolve(
  import.meta.dirname,
  '../../../../public/muscle/models/atlas_skin.glb',
);

function readGlbSkinEnvelopeGeometry(): BufferGeometry {
  const file = fs.readFileSync(SKIN_GLB);
  const jsonLength = file.readUInt32LE(12);
  const doc = JSON.parse(file.slice(20, 20 + jsonLength).toString()) as {
    meshes?: Array<{ primitives?: Array<{ attributes?: { POSITION?: number }; indices?: number }> }>;
    accessors?: Array<{ bufferView?: number; byteOffset?: number; count?: number }>;
    bufferViews?: Array<{ byteOffset?: number }>;
  };

  const prim = doc.meshes?.[0]?.primitives?.[0];
  if (prim?.attributes?.POSITION === undefined) {
    throw new Error('skin POSITION missing from atlas_skin.glb');
  }

  let offset = 12 + 8 + jsonLength;
  offset = (offset + 3) & ~3;
  const binStart = offset + 8;
  const bin = file.slice(binStart, binStart + file.readUInt32LE(offset));

  const posAcc = doc.accessors![prim.attributes.POSITION]!;
  const posView = doc.bufferViews![posAcc.bufferView!]!;
  const posOff = (posView.byteOffset ?? 0) + (posAcc.byteOffset ?? 0);
  const positions = new Float32Array(posAcc.count * 3);
  for (let i = 0; i < posAcc.count; i += 1) {
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
    const indices = new Uint32Array(idxAcc.count);
    for (let i = 0; i < idxAcc.count; i += 1) {
      indices[i] = bin.readUInt16LE(idxOff + i * 2);
    }
    geometry.setIndex(new BufferAttribute(indices, 1));
  }

  return geometry;
}

function medianThoraxX(geometry: BufferGeometry): number {
  const position = geometry.getAttribute('position') as BufferAttribute;
  const xs: number[] = [];
  for (let i = 0; i < position.count; i += 1) {
    const y = position.getY(i);
    const z = position.getZ(i);
    if (y >= 1.2 && y <= 1.6 && Math.abs(z) < 0.12) {
      xs.push(position.getX(i));
    }
  }
  xs.sort((a, b) => a - b);
  return xs[Math.floor(xs.length / 2)] ?? 0;
}

describe('skin + anatomy staging alignment', () => {
  it('keeps unified skin sagittal midline near x=0 after mirror (not shifted to +X bulk)', () => {
    const aligned = alignSkinEnvelopeToStudyHalf(readGlbSkinEnvelopeGeometry().clone());
    expect(Math.abs(medianThoraxX(aligned))).toBeLessThan(0.15);
  });

  it('aligns anatomy and skin sagittal planes after mirror', () => {
    const anatomy = alignAnatomyMeshToStudyHalf(new BoxGeometry(0.2, 1.6, 0.2).translate(-0.18, 0.8, 0));
    const skin = alignSkinEnvelopeToStudyHalf(readGlbSkinEnvelopeGeometry().clone());

    expect(Math.abs(medianThoraxX(anatomy))).toBeLessThan(0.05);
    expect(Math.abs(medianThoraxX(skin))).toBeLessThan(0.15);
    expect(Math.abs(medianThoraxX(skin) - medianThoraxX(anatomy))).toBeLessThan(0.15);
  });
});
