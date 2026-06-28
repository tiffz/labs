import { Suspense, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { muscleModelsManifest as manifest } from '../../types/muscleModelsManifest';
import { getNodeById, resolveCurriculumNodeId } from '../../curriculum';
import { getModuleById } from '../../curriculum/modules';
import type { MuscleRegion } from '../../types/node';
import ProceduralRegionModel from './ProceduralRegionModel';
import { extractGlbMeshes, computeAnatomyGroupTransform, computeStageOrbitTarget } from './extractGlbMeshes';
import GlbAnatomyMesh from './GlbAnatomyMesh';
import { Component, type ReactNode } from 'react';
import { muscleRegionGlbUrl } from './muscleGlbUrl';
import { useMuscleGltf, preloadMuscleGltf } from './muscleGltfLoader';
import { useMuscleStore } from '../../store/useMuscleStore';

class GlbFallbackBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function GlbRegionModel({
  region,
  url,
  useProceduralFallback,
  onStageReady,
}: {
  region: MuscleRegion;
  url: string;
  /** When true, render curriculum placeholders for nodes missing from the GLB. */
  useProceduralFallback: boolean;
  onStageReady?: (center: [number, number, number]) => void;
}) {
  const { invalidate } = useThree();
  const { scene } = useMuscleGltf(url);
  const meshes = useMemo(
    () => extractGlbMeshes(scene, (name) => Boolean(resolveCurriculumNodeId(name))),
    [scene],
  );
  const groupLayout = useMemo(() => computeAnatomyGroupTransform(meshes), [meshes]);
  const glbNodeIds = useMemo(
    () =>
      new Set(
        meshes
          .map((mesh) => resolveCurriculumNodeId(mesh.name))
          .filter((id): id is string => Boolean(id)),
      ),
    [meshes],
  );

  useEffect(() => {
    if (meshes.length > 0) {
      invalidate();
      onStageReady?.(computeStageOrbitTarget(meshes, groupLayout));
    }
  }, [groupLayout, invalidate, meshes, onStageReady]);

  if (import.meta.env.DEV && meshes.length === 0) {
    console.warn(`[muscle] No GLB meshes resolved for region ${region} (${url})`);
  }

  return (
    <>
      <group position={groupLayout.position} scale={groupLayout.scale}>
        {meshes.map((mesh) => {
          const nodeId = resolveCurriculumNodeId(mesh.name);
          const node = nodeId ? getNodeById(nodeId) : undefined;
          if (!node || !nodeId) return null;
          return <GlbAnatomyMesh key={mesh.name} mesh={mesh} node={node} />;
        })}
      </group>
      {useProceduralFallback ? (
        <ProceduralRegionModel region={region} excludeNodeIds={glbNodeIds} />
      ) : null}
    </>
  );
}

interface RegionModelProps {
  region: MuscleRegion;
}

export default function RegionModel({ region }: RegionModelProps) {
  const mod = getModuleById(region);
  const entry = manifest.regions[region];
  const meshCount = entry?.meshes?.length ?? 0;
  const useProceduralFallback = entry?.source !== 'z-anatomy' && entry?.procedural !== false;
  const glbUrl = muscleRegionGlbUrl(mod.glbUrl);
  const isZAnatomy = entry?.source === 'z-anatomy';
  const setAnatomyStageCenter = useMuscleStore((s) => s.setAnatomyStageCenter);

  if (meshCount === 0) {
    return <ProceduralRegionModel region={region} />;
  }

  return (
    <GlbFallbackBoundary
      fallback={isZAnatomy ? null : <ProceduralRegionModel region={region} />}
    >
      <Suspense fallback={null}>
        <GlbRegionModel
          region={region}
          url={glbUrl}
          useProceduralFallback={useProceduralFallback}
          onStageReady={setAnatomyStageCenter}
        />
      </Suspense>
    </GlbFallbackBoundary>
  );
}

for (const mod of Object.values(manifest.regions)) {
  if (mod?.glbUrl && mod.meshes?.length) {
    preloadMuscleGltf(muscleRegionGlbUrl(mod.glbUrl));
  }
}
if (manifest.regions.atlas_supplement?.glbUrl) {
  preloadMuscleGltf(muscleRegionGlbUrl(manifest.regions.atlas_supplement.glbUrl));
}
if (manifest.regions.atlas_head_face?.glbUrl) {
  preloadMuscleGltf(muscleRegionGlbUrl(manifest.regions.atlas_head_face.glbUrl));
}
if (manifest.regions.atlas_complete?.glbUrl) {
  preloadMuscleGltf(muscleRegionGlbUrl(manifest.regions.atlas_complete.glbUrl));
}
