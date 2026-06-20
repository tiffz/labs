import { useMemo } from 'react';
import { getNodeById } from '../../curriculum';
import { muscleModelsManifest as manifest } from '../../types/muscleModelsManifest';
import { extractGlbMeshes } from './extractGlbMeshes';
import { dedupeMeshesPreferDetail } from './meshMergeUtils';
import { muscleRegionGlbUrl } from './muscleGlbUrl';
import { useMuscleGltf } from './muscleGltfLoader';

export { mergeFullBodyMeshes, meshTriangleCount } from './meshMergeUtils';
export function useExtremityModuleMeshes() {
  const handEntry = manifest.regions.hand;
  const footEntry = manifest.regions.foot;
  const handUrl = handEntry?.glbUrl
    ? muscleRegionGlbUrl(handEntry.glbUrl)
    : muscleRegionGlbUrl('/muscle/models/hand.glb');
  const footUrl = footEntry?.glbUrl
    ? muscleRegionGlbUrl(footEntry.glbUrl)
    : muscleRegionGlbUrl('/muscle/models/foot.glb');
  const { scene: handScene } = useMuscleGltf(handUrl);
  const { scene: footScene } = useMuscleGltf(footUrl);

  return useMemo(() => {
    const include = (name: string) => Boolean(getNodeById(name));
    return dedupeMeshesPreferDetail([
      ...extractGlbMeshes(handScene, include),
      ...extractGlbMeshes(footScene, include),
    ]);
  }, [footScene, handScene]);
}
