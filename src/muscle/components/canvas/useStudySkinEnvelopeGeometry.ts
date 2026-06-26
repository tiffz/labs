import { useMemo } from 'react';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { muscleModelsManifest as manifest } from '../../types/muscleModelsManifest';
import { alignSkinEnvelopeToStudyHalf } from './alignSkinEnvelopeGeometry';
import {
  clipSkinGeometryForReferenceHalf,
  clipSkinGeometryForStudyHalf,
} from './skinHalfClipOptions';
import { extractGlbMeshes } from './extractGlbMeshes';
import { muscleRegionGlbUrl } from './muscleGlbUrl';
import { useMuscleGltf } from './muscleGltfLoader';

function isSkinMeshName(name: string): boolean {
  return name === 'skin_envelope' || name.startsWith('skin_');
}

function mergeAlignedSkinBody(meshes: ReturnType<typeof extractGlbMeshes>): BufferGeometry | null {
  const aligned = meshes.map((mesh) => alignSkinEnvelopeToStudyHalf(mesh.geometry.clone()));
  const body = aligned.filter((_, i) => meshes[i]!.name !== 'skin_ear');
  const combined = body.length <= 1 ? body[0] : mergeGeometries(body, false);
  if (!combined) return null;
  combined.computeVertexNormals();
  return combined;
}

/** Runtime skin geometry for a sagittal half — same align + clip path as SkinEnvelopeLayer. */
export function useSkinEnvelopeGeometryForHalf(half: 'reference' | 'study'): BufferGeometry | null {
  const entry = manifest.regions.atlas_skin;
  const url = entry?.glbUrl
    ? muscleRegionGlbUrl(entry.glbUrl)
    : muscleRegionGlbUrl('/muscle/models/atlas_skin.glb');
  const { scene } = useMuscleGltf(url);

  return useMemo(() => {
    const meshes = extractGlbMeshes(scene, (name) => isSkinMeshName(name));
    if (meshes.length === 0) return null;
    const merged = mergeAlignedSkinBody(meshes);
    if (!merged) return null;
    return half === 'study'
      ? clipSkinGeometryForStudyHalf(merged)
      : clipSkinGeometryForReferenceHalf(merged);
  }, [half, scene]);
}

/** @deprecated Use useSkinEnvelopeGeometryForHalf('study') */
export function useStudySkinEnvelopeGeometry(): BufferGeometry | null {
  return useSkinEnvelopeGeometryForHalf('study');
}
