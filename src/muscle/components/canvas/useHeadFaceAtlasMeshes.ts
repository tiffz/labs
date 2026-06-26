import { useMemo } from 'react';
import { getNodeById } from '../../curriculum';
import { muscleModelsManifest as manifest } from '../../types/muscleModelsManifest';
import { extractGlbMeshes } from './extractGlbMeshes';
import { shouldIncludeHeadFaceAtlasMesh } from './fullBodyAtlasFilter';
import { muscleRegionGlbUrl } from './muscleGlbUrl';
import { useMuscleGltf } from './muscleGltfLoader';

/** Head and face atlas — facial muscles and skull detail for Full body view. */
export function useHeadFaceAtlasMeshes() {
  const entry = manifest.regions.atlas_head_face;
  const url = entry?.glbUrl
    ? muscleRegionGlbUrl(entry.glbUrl)
    : muscleRegionGlbUrl('/muscle/models/atlas_head_face.glb');
  const { scene } = useMuscleGltf(url);
  return useMemo(
    () =>
      extractGlbMeshes(scene, (name) => {
        if (!shouldIncludeHeadFaceAtlasMesh(name)) return false;
        return Boolean(getNodeById(name));
      }),
    [scene],
  );
}
