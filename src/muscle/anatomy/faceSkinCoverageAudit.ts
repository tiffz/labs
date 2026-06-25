import type { BufferAttribute, BufferGeometry } from 'three';
import { alignSkinEnvelopeToStudyHalf } from '../components/canvas/alignSkinEnvelopeGeometry';
import { clipSkinGeometryToStudyHalf } from '../components/canvas/clipSkinToStudyHalf';
import { readGlbSkinEnvelopeGeometry, SKIN_GLB_PATH } from './skinGlbEnvelopeReader';

export { SKIN_GLB_PATH };

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
