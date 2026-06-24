import { useMemo } from 'react';
import { muscleModelsManifest as manifest } from '../../types/muscleModelsManifest';
import { extractGlbMeshes } from './extractGlbMeshes';
import { shouldIncludeAtlasCompleteMesh } from './fullBodyAtlasFilter';
import { muscleRegionGlbUrl } from './muscleGlbUrl';
import { useMuscleGltf } from './muscleGltfLoader';

/** Full-body Z-Anatomy export — atlas-registry fill only (curriculum meshes load from regional GLBs). */
export function useAtlasCompleteMeshes() {
  const entry = manifest.regions.atlas_complete;
  const url = entry?.glbUrl
    ? muscleRegionGlbUrl(entry.glbUrl)
    : muscleRegionGlbUrl('/muscle/models/atlas_complete.glb');
  const { scene } = useMuscleGltf(url);
  return useMemo(
    () => extractGlbMeshes(scene, (name) => shouldIncludeAtlasCompleteMesh(name)),
    [scene],
  );
}
