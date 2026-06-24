import fs from 'node:fs';
import path from 'node:path';
import { BufferAttribute, BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { alignSkinEnvelopeToStudyHalf } from './alignSkinEnvelopeGeometry';
import { clipSkinGeometryToStudyHalf } from './clipSkinToStudyHalf';

const SKIN_GLB = path.resolve(
  import.meta.dirname,
  '../../../../public/muscle/models/atlas_skin.glb',
);

type GlbDoc = {
  accessors?: Array<{
    bufferView?: number;
    byteOffset?: number;
    count?: number;
    componentType?: number;
  }>;
  bufferViews?: Array<{ byteOffset?: number; byteLength?: number }>;
  meshes?: Array<{ name?: string; primitives?: Array<{ attributes?: { POSITION?: number }; indices?: number }> }>;
};

function readGlbBinBuffer(glbPath: string): Buffer {
  const file = fs.readFileSync(glbPath);
  let offset = 12;
  const jsonLength = file.readUInt32LE(offset);
  offset += 8 + jsonLength;
  offset = (offset + 3) & ~3;
  const binLength = file.readUInt32LE(offset);
  const binStart = offset + 8;
  return file.slice(binStart, binStart + binLength);
}

function readGlbSkinEnvelopeGeometry(): BufferGeometry {
  const bin = readGlbBinBuffer(SKIN_GLB);
  const file = fs.readFileSync(SKIN_GLB);
  const jsonLength = file.readUInt32LE(12);
  const doc = JSON.parse(file.slice(20, 20 + jsonLength).toString()) as GlbDoc;

  const mesh = doc.meshes?.[0];
  const prim = mesh?.primitives?.[0];
  if (prim.attributes.POSITION === undefined) {
    throw new Error('skin POSITION missing from atlas_skin.glb');
  }

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

function triangleCount(geometry: BufferGeometry): number {
  const index = geometry.getIndex();
  return index ? index.count / 3 : geometry.getAttribute('position').count / 3;
}

describe('skin envelope study-half clip', () => {
  it('keeps most of atlas_skin.glb after X-align + study sagittal clip', () => {
    const envelope = readGlbSkinEnvelopeGeometry();
    const total = triangleCount(envelope);
    const aligned = alignSkinEnvelopeToStudyHalf(envelope.clone());
    const clipped = clipSkinGeometryToStudyHalf(aligned, 0);
    const kept = triangleCount(clipped);

    aligned.computeBoundingBox();
    const box = aligned.boundingBox!;

    expect(aligned.boundingBox!.max.x).toBeGreaterThan(Math.abs(aligned.boundingBox!.min.x));
    expect(
      kept / total,
      `aligned x=[${box.min.x.toFixed(3)}, ${box.max.x.toFixed(3)}] kept ${kept}/${total}`,
    ).toBeGreaterThan(0.35);
  });

  it('retains suprasternal skin after align+clip (trap/clavicle band)', () => {
    const envelope = readGlbSkinEnvelopeGeometry();
    const aligned = alignSkinEnvelopeToStudyHalf(envelope.clone());
    const clipped = clipSkinGeometryToStudyHalf(aligned, 0, {
      anyVertexOnHalf: true,
      preserveMidlinePelvis: true,
      preserveMidlineThorax: true,
      preserveMidlineFace: true,
      preserveMidlineAnteriorNeck: true,
    });

    const pos = aligned.getAttribute('position');
    const idx = aligned.getIndex()!;
    let trapBefore = 0;
    for (let t = 0; t < idx.count / 3; t += 1) {
      const i0 = idx.getX(t * 3)!;
      const i1 = idx.getX(t * 3 + 1)!;
      const i2 = idx.getX(t * 3 + 2)!;
      const cy = (pos.getY(i0) + pos.getY(i1) + pos.getY(i2)) / 3;
      const maxAbsX = Math.max(Math.abs(pos.getX(i0)), Math.abs(pos.getX(i1)), Math.abs(pos.getX(i2)));
      if (cy >= 1.15 && cy <= 1.72 && maxAbsX < 0.12) trapBefore += 1;
    }

    const cpos = clipped.getAttribute('position');
    const cidx = clipped.getIndex()!;
    let trapAfter = 0;
    for (let t = 0; t < cidx.count / 3; t += 1) {
      const i0 = cidx.getX(t * 3)!;
      const i1 = cidx.getX(t * 3 + 1)!;
      const i2 = cidx.getX(t * 3 + 2)!;
      const cy = (cpos.getY(i0) + cpos.getY(i1) + cpos.getY(i2)) / 3;
      const maxAbsX = Math.max(Math.abs(cpos.getX(i0)), Math.abs(cpos.getX(i1)), Math.abs(cpos.getX(i2)));
      if (cy >= 1.15 && cy <= 1.72 && maxAbsX < 0.12) trapAfter += 1;
    }

    expect(trapBefore).toBeGreaterThan(20);
    expect(trapAfter / trapBefore).toBeGreaterThan(0.85);
  });
});
