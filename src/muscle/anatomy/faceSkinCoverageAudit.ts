import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BufferAttribute, BufferGeometry } from 'three';
import { alignSkinEnvelopeToStudyHalf } from '../components/canvas/alignSkinEnvelopeGeometry';
import { clipSkinGeometryToStudyHalf } from '../components/canvas/clipSkinToStudyHalf';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const SKIN_GLB_PATH = 'public/muscle/models/atlas_skin.glb';

type GlbDoc = {
  meshes?: Array<{ name?: string; primitives?: Array<{ attributes?: { POSITION?: number }; indices?: number }> }>;
  accessors?: Array<{
    bufferView?: number;
    byteOffset?: number;
    count?: number;
    componentType?: number;
  }>;
  bufferViews?: Array<{ byteOffset?: number; byteLength?: number }>;
};

export type FaceSkinBandId = 'eyebrow' | 'noseTip' | 'nasolabial' | 'earLateral' | 'anteriorNeck';

export type FaceSkinBandSpec = {
  id: FaceSkinBandId;
  label: string;
  matches: (centroid: { x: number; y: number; z: number }, verts: { x: number; y: number; z: number }[]) => boolean;
};

export const FACE_SKIN_BANDS: FaceSkinBandSpec[] = [
  {
    id: 'eyebrow',
    label: 'Eyebrow / supraorbital skin',
    matches: (c) => c.y >= 1.62 && c.y <= 1.78 && c.z > 0.03,
  },
  {
    id: 'noseTip',
    label: 'Nose tip / dorsum',
    matches: (c) => c.z > 0.1 && c.y >= 1.48 && c.y <= 1.62,
  },
  {
    id: 'nasolabial',
    label: 'Nasolabial / perioral midline skin',
    matches: (c, verts) => {
      const minX = Math.min(...verts.map((v) => v.x));
      const maxAbsX = Math.max(...verts.map((v) => Math.abs(v.x)));
      return (
        c.y >= 1.35 &&
        c.y <= 1.55 &&
        (maxAbsX < 0.08 || minX < 0.15)
      );
    },
  },
  {
    id: 'earLateral',
    label: 'Lateral auricular / helix skin',
    matches: (c, verts) =>
      c.y >= 1.45 &&
      c.y <= 1.65 &&
      Math.max(...verts.map((v) => Math.abs(v.x))) > 0.1,
  },
  {
    id: 'anteriorNeck',
    label: 'Anterior neck / platysma junction skin',
    matches: (c, verts) => {
      const maxAbsX = Math.max(...verts.map((v) => Math.abs(v.x)));
      return c.y >= 1.05 && c.y <= 1.38 && maxAbsX < 0.12;
    },
  },
];

function readGlbSkinEnvelopeGeometry(glbRelativePath = SKIN_GLB_PATH): BufferGeometry {
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

export type FaceSkinBandCount = {
  id: FaceSkinBandId;
  label: string;
  triangleCount: number;
};

function countFaceSkinBands(geometry: BufferGeometry): FaceSkinBandCount[] {
  const position = geometry.getAttribute('position') as BufferAttribute;
  const index = geometry.getIndex();
  if (!index) throw new Error('skin_envelope must be indexed');

  const counts = new Map<FaceSkinBandId, number>(
    FACE_SKIN_BANDS.map((band) => [band.id, 0]),
  );

  for (let tri = 0; tri < index.count / 3; tri += 1) {
    const verts = [0, 1, 2].map((corner) => {
      const vi = index.getX(tri * 3 + corner)!;
      return {
        x: position.getX(vi),
        y: position.getY(vi),
        z: position.getZ(vi),
      };
    });
    const centroid = {
      x: (verts[0]!.x + verts[1]!.x + verts[2]!.x) / 3,
      y: (verts[0]!.y + verts[1]!.y + verts[2]!.y) / 3,
      z: (verts[0]!.z + verts[1]!.z + verts[2]!.z) / 3,
    };

    for (const band of FACE_SKIN_BANDS) {
      if (band.matches(centroid, verts)) {
        counts.set(band.id, (counts.get(band.id) ?? 0) + 1);
      }
    }
  }

  return FACE_SKIN_BANDS.map((band) => ({
    id: band.id,
    label: band.label,
    triangleCount: counts.get(band.id) ?? 0,
  }));
}

export function auditRawFaceSkinCoverage(glbRelativePath = SKIN_GLB_PATH): FaceSkinBandCount[] {
  return countFaceSkinBands(readGlbSkinEnvelopeGeometry(glbRelativePath));
}

export function auditRuntimeFaceSkinCoverage(glbRelativePath = SKIN_GLB_PATH): FaceSkinBandCount[] {
  const aligned = alignSkinEnvelopeToStudyHalf(readGlbSkinEnvelopeGeometry(glbRelativePath).clone());
  const clipped = clipSkinGeometryToStudyHalf(aligned, 0, {
    anyVertexOnHalf: true,
    preserveMidlinePelvis: true,
    preserveMidlineThorax: true,
    preserveMidlineFace: true,
    preserveMidlineAnteriorNeck: true,
  });
  return countFaceSkinBands(clipped);
}

export function formatFaceSkinCoverageAudit(rows: FaceSkinBandCount[]): string {
  return rows.map((row) => `- ${row.id}: ${row.triangleCount} tris (${row.label})`).join('\n');
}
