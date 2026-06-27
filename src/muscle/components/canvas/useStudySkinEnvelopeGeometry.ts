import { useMemo } from 'react';
import type { BufferGeometry } from 'three';
import { mergeSkinEnvelopeParts } from './mergeSkinEnvelopeGeometry';
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
  if (aligned.length === 0) return null;
  if (aligned.length === 1) return aligned[0]!;
  return mergeSkinEnvelopeParts(aligned);
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
