import { useMemo } from 'react';
import { getNodeById } from '../../curriculum';
import { muscleModelsManifest as manifest } from '../../types/muscleModelsManifest';
import { extractGlbMeshes } from './extractGlbMeshes';
import { muscleRegionGlbUrl } from './muscleGlbUrl';
import { useMuscleGltf } from './muscleGltfLoader';

/** Full-body Z-Anatomy export — every muscle and bone mesh with a known node id. */
export function useAtlasCompleteMeshes() {
  const entry = manifest.regions.atlas_complete;
  const url = entry?.glbUrl
    ? muscleRegionGlbUrl(entry.glbUrl)
    : muscleRegionGlbUrl('/muscle/models/atlas_complete.glb');
  const { scene } = useMuscleGltf(url);
  return useMemo(
    () => extractGlbMeshes(scene, (name) => Boolean(getNodeById(name))),
    [scene],
  );
}
