import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BufferAttribute, BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { alignSkinEnvelopeToStudyHalf } from '../components/canvas/alignSkinEnvelopeGeometry';
import { clipSkinGeometryToStudyHalf } from '../components/canvas/clipSkinToStudyHalf';
import { countBoundaryEdges } from './skinMeshBoundaryAudit';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const GLB = path.join(REPO_ROOT, 'public/muscle/models/atlas_skin.glb');

type BandCtx = { cy: number; cz: number; maxAbsX: number; minX: number; cx: number };

const SKIN_BANDS: Record<string, (ctx: BandCtx) => boolean> = {
  pecDeltJunction: ({ cy, maxAbsX, cz }) =>
    cy >= 1.05 && cy <= 1.35 && maxAbsX > 0.08 && maxAbsX < 0.28 && cz > -0.05,
  perioralMidline: ({ cy, maxAbsX }) => cy >= 1.32 && cy <= 1.48 && maxAbsX < 0.06,
  jawLateral: ({ cy, maxAbsX }) => cy >= 1.22 && cy <= 1.38 && maxAbsX >= 0.04 && maxAbsX < 0.14,
  anteriorNeckMid: ({ cy, maxAbsX }) => cy >= 1.05 && cy <= 1.25 && maxAbsX < 0.08,
  submentalBand: ({ cy, maxAbsX, cz }) => cy >= 1.18 && cy <= 1.34 && maxAbsX < 0.1 && cz > 0.02,
};

/** Max open seam edges allowed per band — regression ceiling from 2026-06-24 export. */
const MAX_BOUNDARY_EDGES_BY_BAND: Record<string, number> = {
  pecDeltJunction: 670,
  submentalBand: 250,
  jawLateral: 720,
  perioralMidline: 670,
};

function readSkinEnvelope(): BufferGeometry {
  const file = fs.readFileSync(GLB);
  const jsonLen = file.readUInt32LE(12);
  const doc = JSON.parse(file.slice(20, 20 + jsonLen).toString()) as {
    accessors: Array<{ bufferView?: number; byteOffset?: number; count?: number }>;
    bufferViews: Array<{ byteOffset?: number }>;
    meshes: Array<{ primitives: Array<{ attributes: { POSITION: number }; indices: number }> }>;
  };
  let off = 12 + 8 + jsonLen;
  off = (off + 3) & ~3;
  const bin = file.slice(off + 8, off + 8 + file.readUInt32LE(off));
  const prim = doc.meshes[0]!.primitives[0]!;
  const posAcc = doc.accessors[prim.attributes.POSITION]!;
  const posView = doc.bufferViews[posAcc.bufferView!]!;
  const posOff = (posView.byteOffset ?? 0) + (posAcc.byteOffset ?? 0);
  const positions = new Float32Array(posAcc.count! * 3);
  for (let i = 0; i < posAcc.count!; i += 1) {
    positions[i * 3] = bin.readFloatLE(posOff + i * 12);
    positions[i * 3 + 1] = bin.readFloatLE(posOff + i * 12 + 4);
    positions[i * 3 + 2] = bin.readFloatLE(posOff + i * 12 + 8);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  const idxAcc = doc.accessors[prim.indices]!;
  const idxView = doc.bufferViews[idxAcc.bufferView!]!;
  const idxOff = (idxView.byteOffset ?? 0) + (idxAcc.byteOffset ?? 0);
  const indices = new Uint32Array(idxAcc.count!);
  for (let i = 0; i < idxAcc.count!; i += 1) indices[i] = bin.readUInt16LE(idxOff + i * 2);
  geometry.setIndex(new BufferAttribute(indices, 1));
  return geometry;
}

function countBands(geometry: BufferGeometry): Record<string, number> {
  const pos = geometry.getAttribute('position');
  const idx = geometry.getIndex()!;
  const out = Object.fromEntries(Object.keys(SKIN_BANDS).map((k) => [k, 0]));
  for (let t = 0; t < idx.count / 3; t += 1) {
    const verts = [0, 1, 2].map((c) => {
      const vi = idx.getX(t * 3 + c)!;
      return { x: pos.getX(vi), y: pos.getY(vi), z: pos.getZ(vi) };
    });
    const cy = (verts[0]!.y + verts[1]!.y + verts[2]!.y) / 3;
    const cz = (verts[0]!.z + verts[1]!.z + verts[2]!.z) / 3;
    const cx = (verts[0]!.x + verts[1]!.x + verts[2]!.x) / 3;
    const maxAbsX = Math.max(...verts.map((v) => Math.abs(v.x)));
    const minX = Math.min(...verts.map((v) => v.x));
    const ctx = { cy, cz, maxAbsX, minX, cx };
    for (const [k, fn] of Object.entries(SKIN_BANDS)) {
      if (fn(ctx)) out[k]! += 1;
    }
  }
  return out;
}

function bandForPoint(x: number, y: number, z: number): string | null {
  const maxAbsX = Math.abs(x);
  const ctx: BandCtx = { cx: x, cy: y, cz: z, maxAbsX, minX: x };
  for (const [id, fn] of Object.entries(SKIN_BANDS)) {
    if (fn(ctx)) return id;
  }
  return null;
}

function countBoundaryEdgesInBands(geometry: BufferGeometry): Record<string, number> {
  const pos = geometry.getAttribute('position');
  const idx = geometry.getIndex()!;
  const edgeCounts = new Map<string, number>();
  for (let i = 0; i + 2 < idx.count; i += 3) {
    const tri = [idx.getX(i)!, idx.getX(i + 1)!, idx.getX(i + 2)!];
    for (let e = 0; e < 3; e += 1) {
      const a = tri[e]!;
      const b = tri[(e + 1) % 3]!;
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
  }

  const out = Object.fromEntries(Object.keys(SKIN_BANDS).map((k) => [k, 0]));
  for (const [key, count] of edgeCounts) {
    if (count !== 1) continue;
    const [aStr, bStr] = key.split(':');
    const a = Number(aStr);
    const b = Number(bStr);
    const mx = (pos.getX(a) + pos.getX(b)) / 2;
    const my = (pos.getY(a) + pos.getY(b)) / 2;
    const mz = (pos.getZ(a) + pos.getZ(b)) / 2;
    const band = bandForPoint(mx, my, mz);
    if (band) out[band]! += 1;
  }
  return out;
}

describe('skin band clip audit', () => {
  it('prints band retention through align+clip', () => {
    const raw = countBands(readSkinEnvelope());
    const aligned = alignSkinEnvelopeToStudyHalf(readSkinEnvelope().clone());
    const clipped = clipSkinGeometryToStudyHalf(aligned, 0);
    const after = countBands(clipped);
    const lines = ['band\traw\tafter\tloss%'];
    for (const k of Object.keys(SKIN_BANDS)) {
      const loss = raw[k]! ? (((raw[k]! - after[k]!) / raw[k]!) * 100).toFixed(1) : 'n/a';
      lines.push(`${k}\t${raw[k]}\t${after[k]}\t${loss}%`);
    }
    console.log(lines.join('\n'));
    expect(after.pecDeltJunction).toBeGreaterThan(0);
  });

  it('does not regress open seam edges in face/neck/pec-delt bands', () => {
    const geometry = readSkinEnvelope();
    const edges = countBoundaryEdgesInBands(geometry);
    const failures: string[] = [];
    for (const [band, max] of Object.entries(MAX_BOUNDARY_EDGES_BY_BAND)) {
      if ((edges[band] ?? 0) > max) {
        failures.push(`${band}: ${edges[band]} boundary edges > ${max}`);
      }
    }
    expect(failures, JSON.stringify(edges)).toEqual([]);
    expect(countBoundaryEdges(new Uint32Array(geometry.getIndex()!.array))).toBeGreaterThan(0);
  });
});
