import { useMemo } from 'react';
import { getNodeById } from '../../curriculum';
import { muscleModelsManifest as manifest } from '../../types/muscleModelsManifest';
import { extractGlbMeshes } from './extractGlbMeshes';
import { muscleRegionGlbUrl } from './muscleGlbUrl';
import { useMuscleGltf } from './muscleGltfLoader';

/** Core skeleton + joints from fundamentals.glb — required for Full body bone completeness. */
export function useFundamentalsMeshes() {
  const entry = manifest.regions.fundamentals;
  const url = entry?.glbUrl
    ? muscleRegionGlbUrl(entry.glbUrl)
    : muscleRegionGlbUrl('/muscle/models/fundamentals.glb');
  const { scene } = useMuscleGltf(url);
  return useMemo(
    () => extractGlbMeshes(scene, (name) => Boolean(getNodeById(name))),
    [scene],
  );
}
