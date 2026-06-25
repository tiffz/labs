import { useMemo } from 'react';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { muscleModelsManifest as manifest } from '../../types/muscleModelsManifest';
import { alignSkinEnvelopeToStudyHalf } from './alignSkinEnvelopeGeometry';
import { clipSkinGeometryToStudyHalf } from './clipSkinToStudyHalf';
import { extractGlbMeshes } from './extractGlbMeshes';
import { muscleRegionGlbUrl } from './muscleGlbUrl';
import { useMuscleGltf } from './muscleGltfLoader';

function isSkinMeshName(name: string): boolean {
  return name === 'skin_envelope' || name.startsWith('skin_');
}

function clipSkinForHalf(geometry: BufferGeometry): BufferGeometry {
  return clipSkinGeometryToStudyHalf(geometry.clone(), 0, {
    anyVertexOnHalf: true,
    preserveMidlinePelvis: true,
    preserveMidlineThorax: true,
    preserveMidlineFace: true,
    preserveMidlineAnteriorNeck: true,
  });
}

/** Runtime study-half skin geometry — same align + clip path as SkinEnvelopeLayer. */
export function useStudySkinEnvelopeGeometry(): BufferGeometry | null {
  const entry = manifest.regions.atlas_skin;
  const url = entry?.glbUrl
    ? muscleRegionGlbUrl(entry.glbUrl)
    : muscleRegionGlbUrl('/muscle/models/atlas_skin.glb');
  const { scene } = useMuscleGltf(url);

  return useMemo(() => {
    const meshes = extractGlbMeshes(scene, (name) => isSkinMeshName(name));
    if (meshes.length === 0) return null;

    const aligned = meshes.map((mesh) => alignSkinEnvelopeToStudyHalf(mesh.geometry.clone()));
    const combined =
      aligned.length <= 1
        ? aligned[0]
        : mergeGeometries(aligned, false);
    if (!combined) return null;
    combined.computeVertexNormals();
    return clipSkinForHalf(combined);
  }, [scene]);
}
