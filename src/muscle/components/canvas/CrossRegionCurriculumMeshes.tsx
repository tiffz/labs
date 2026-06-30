import { useMemo } from 'react';
import { getNodeById, resolveCurriculumNodeId } from '../../curriculum';
import { extractGlbMeshes } from './extractGlbMeshes';
import GlbAnatomyMesh from './GlbAnatomyMesh';
import { muscleRegionGlbUrl } from './muscleGlbUrl';
import { useMuscleGltf } from './muscleGltfLoader';
import type { MuscleRegion } from '../../types/node';

/** Meshes borrowed from another region GLB for study context (e.g. leg module shows femur/tibia). */
const CROSS_REGION_NODE_IDS: Partial<Record<MuscleRegion, readonly { nodeId: string; sourceGlb: string }[]>> = {
  leg: [
    { nodeId: 'bone_femur', sourceGlb: '/muscle/models/fundamentals.glb' },
    { nodeId: 'bone_tibia', sourceGlb: '/muscle/models/fundamentals.glb' },
  ],
};

export default function CrossRegionCurriculumMeshes({
  region,
  excludeNodeIds,
  groupLayout,
}: {
  region: MuscleRegion;
  excludeNodeIds: ReadonlySet<string>;
  groupLayout: { position: [number, number, number]; scale: number };
}) {
  const refs = CROSS_REGION_NODE_IDS[region];
  const fundamentalsUrl = muscleRegionGlbUrl('/muscle/models/fundamentals.glb');
  const { scene } = useMuscleGltf(fundamentalsUrl);

  const meshes = useMemo(() => {
    if (!refs) return [];
    const wanted = new Set(refs.map((ref) => ref.nodeId));
    return extractGlbMeshes(scene, (name) => Boolean(resolveCurriculumNodeId(name))).filter(
      (mesh) => {
        const nodeId = resolveCurriculumNodeId(mesh.name);
        return nodeId && wanted.has(nodeId) && !excludeNodeIds.has(nodeId);
      },
    );
  }, [excludeNodeIds, refs, scene]);

  if (!refs || meshes.length === 0) return null;

  return (
    <group position={groupLayout.position} scale={groupLayout.scale}>
      {meshes.map((mesh) => {
        const nodeId = resolveCurriculumNodeId(mesh.name);
        const node = nodeId ? getNodeById(nodeId) : undefined;
        if (!node || !nodeId) return null;
        return <GlbAnatomyMesh key={`cross-${mesh.name}`} mesh={mesh} node={node} />;
      })}
    </group>
  );
}
