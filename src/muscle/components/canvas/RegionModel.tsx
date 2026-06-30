import { Suspense, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { muscleModelsManifest as manifest } from '../../types/muscleModelsManifest';
import { getNodeById, getNodesForRegion, resolveCurriculumNodeId } from '../../curriculum';
import { getModuleById } from '../../curriculum/modules';
import type { MuscleRegion } from '../../types/node';
import type { AnatomyStageFrame } from '../../types/anatomyStageFrame';
import ProceduralRegionModel from './ProceduralRegionModel';
import { extractGlbMeshes, computeAnatomyGroupTransform, computeStageFrame } from './extractGlbMeshes';
import GlbAnatomyMesh from './GlbAnatomyMesh';
import CrossRegionCurriculumMeshes from './CrossRegionCurriculumMeshes';
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

function AtlasSupplementMeshes({
  region,
  excludeNodeIds,
  groupLayout,
}: {
  region: MuscleRegion;
  excludeNodeIds: ReadonlySet<string>;
  groupLayout: { position: [number, number, number]; scale: number };
}) {
  const supplementUrl = muscleRegionGlbUrl('/muscle/models/atlas_supplement.glb');
  const { scene } = useMuscleGltf(supplementUrl);
  const regionNodeIds = useMemo(
    () =>
      new Set(
        getNodesForRegion(region)
          .filter((node) => !node.atlasOnly)
          .map((node) => node.id),
      ),
    [region],
  );
  const meshes = useMemo(() => {
    return extractGlbMeshes(scene, (name) => Boolean(resolveCurriculumNodeId(name))).filter(
      (mesh) => {
        const nodeId = resolveCurriculumNodeId(mesh.name);
        return (
          nodeId &&
          regionNodeIds.has(nodeId) &&
          !excludeNodeIds.has(nodeId)
        );
      },
    );
  }, [excludeNodeIds, regionNodeIds, scene]);

  if (meshes.length === 0) return null;

  return (
    <group position={groupLayout.position} scale={groupLayout.scale}>
      {meshes.map((mesh) => {
        const nodeId = resolveCurriculumNodeId(mesh.name);
        const node = nodeId ? getNodeById(nodeId) : undefined;
        if (!node || !nodeId) return null;
        return <GlbAnatomyMesh key={`supp-${mesh.name}`} mesh={mesh} node={node} />;
      })}
    </group>
  );
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
  onStageReady?: (frame: AnatomyStageFrame) => void;
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
      onStageReady?.(computeStageFrame(meshes, groupLayout));
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
      {(region === 'leg' || region === 'shoulder_neck') && (
        <AtlasSupplementMeshes
          region={region}
          excludeNodeIds={glbNodeIds}
          groupLayout={groupLayout}
        />
      )}
      {region === 'leg' ? (
        <CrossRegionCurriculumMeshes
          region={region}
          excludeNodeIds={glbNodeIds}
          groupLayout={groupLayout}
        />
      ) : null}
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
  const isZAnatomy = entry?.source === 'z-anatomy';
  const useProceduralFallback = !isZAnatomy && entry?.procedural !== false;
  const glbUrl = muscleRegionGlbUrl(mod.glbUrl);
  const setAnatomyStageFrame = useMuscleStore((s) => s.setAnatomyStageFrame);

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
          onStageReady={setAnatomyStageFrame}
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
if (manifest.regions.fundamentals?.glbUrl) {
  preloadMuscleGltf(muscleRegionGlbUrl(manifest.regions.fundamentals.glbUrl));
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
