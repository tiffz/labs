import { Suspense, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { muscleModelsManifest as manifest } from '../../types/muscleModelsManifest';
import { getNodeById, getNodesForRegion, resolveCurriculumNodeId } from '../../curriculum';
import { getModuleById } from '../../curriculum/modules';
import type { MuscleRegion } from '../../types/node';
import ProceduralRegionModel from './ProceduralRegionModel';
import { extractGlbMeshes, computeAnatomyGroupTransform } from './extractGlbMeshes';
import GlbAnatomyMesh from './GlbAnatomyMesh';
import { Component, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';

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
}: {
  region: MuscleRegion;
  url: string;
  useProceduralFallback: boolean;
}) {
  const { invalidate } = useThree();
  const { scene } = useGLTF(url);
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
  const missingGlbNodeIds = useMemo(() => {
    const missing = new Set<string>();
    for (const node of getNodesForRegion(region)) {
      if (!glbNodeIds.has(node.id)) missing.add(node.id);
    }
    return missing;
  }, [glbNodeIds, region]);

  useEffect(() => {
    if (meshes.length > 0) invalidate();
  }, [invalidate, meshes]);

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
      ) : missingGlbNodeIds.size > 0 ? (
        <ProceduralRegionModel region={region} includeNodeIds={missingGlbNodeIds} />
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

  if (meshCount === 0) {
    return <ProceduralRegionModel region={region} />;
  }

  return (
    <GlbFallbackBoundary fallback={<ProceduralRegionModel region={region} />}>
      <Suspense fallback={null}>
        <GlbRegionModel
          region={region}
          url={mod.glbUrl}
          useProceduralFallback={useProceduralFallback}
        />
      </Suspense>
    </GlbFallbackBoundary>
  );
}

for (const mod of Object.values(manifest.regions)) {
  if (mod?.glbUrl && mod.meshes?.length) {
    useGLTF.preload(mod.glbUrl);
  }
}
