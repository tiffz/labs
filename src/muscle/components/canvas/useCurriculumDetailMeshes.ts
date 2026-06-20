import { useMemo } from 'react';
import { getNodeById } from '../../curriculum';
import { muscleModelsManifest as manifest } from '../../types/muscleModelsManifest';
import { extractGlbMeshes } from './extractGlbMeshes';
import { dedupeMeshesPreferDetail } from './meshMergeUtils';
import { muscleRegionGlbUrl } from './muscleGlbUrl';
import { useMuscleGltf } from './muscleGltfLoader';

type DetailRegionId = 'torso' | 'shoulder_neck' | 'arm' | 'leg' | 'atlas_supplement';

function regionGlbUrl(region: DetailRegionId): string {
  const entry = manifest.regions[region];
  const path = entry?.glbUrl ?? `/muscle/models/${region}.glb`;
  return muscleRegionGlbUrl(path);
}

/**
 * Regional module GLBs keep higher triangle counts than atlas_complete for curriculum nodes.
 * Loaded last in mergeFullBodyMeshes so they win dedupe over decimated atlas copies.
 */
export function useCurriculumDetailMeshes() {
  const torso = useMuscleGltf(regionGlbUrl('torso'));
  const shoulderNeck = useMuscleGltf(regionGlbUrl('shoulder_neck'));
  const arm = useMuscleGltf(regionGlbUrl('arm'));
  const leg = useMuscleGltf(regionGlbUrl('leg'));
  const supplement = useMuscleGltf(regionGlbUrl('atlas_supplement'));

  return useMemo(() => {
    const include = (name: string) => Boolean(getNodeById(name));
    const scenes = [torso.scene, shoulderNeck.scene, arm.scene, leg.scene, supplement.scene];
    return dedupeMeshesPreferDetail(
      scenes.flatMap((scene) => extractGlbMeshes(scene, include)),
    );
  }, [arm.scene, leg.scene, shoulderNeck.scene, supplement.scene, torso.scene]);
}
