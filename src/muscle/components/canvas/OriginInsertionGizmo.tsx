import { Suspense, useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import type { BufferGeometry, Mesh } from 'three';
import { getNodeById } from '../../curriculum';
import { muscleModelsManifest as manifest } from '../../types/muscleModelsManifest';
import { useMuscleStore } from '../../store/useMuscleStore';
import { buildAttachmentMarkers } from './attachmentMarkers';
import { computeAttachmentSites } from './attachmentSites';
import { extractGlbMeshes } from './extractGlbMeshes';
import { muscleRegionGlbUrl } from './muscleGlbUrl';
import { useMuscleGltf } from './muscleGltfLoader';

/** Marker radius in staged (world) units, so markers keep one size across region zoom levels. */
const MARKER_WORLD_RADIUS = 0.022;

/** Bones live in other region GLBs; the atlas holds every bone in the same Z-Anatomy frame. */
function useAtlasBoneGeometries(boneIds: readonly string[]): Map<string, BufferGeometry> {
  const url = muscleRegionGlbUrl(
    manifest.regions.atlas_complete?.glbUrl ?? '/muscle/models/atlas_complete.glb',
  );
  const { scene } = useMuscleGltf(url);
  const key = boneIds.join('|');
  return useMemo(() => {
    const wanted = new Set(key.split('|'));
    const bones = extractGlbMeshes(scene, (nodeId) => wanted.has(nodeId));
    return new Map(bones.map((bone) => [bone.name, bone.geometry]));
  }, [key, scene]);
}

function AttachmentMarkers({
  muscle,
  originBoneId,
  insertionBoneId,
  stageScale,
}: {
  muscle: BufferGeometry;
  originBoneId: string;
  insertionBoneId: string;
  stageScale: number;
}) {
  const { invalidate } = useThree();
  const bones = useAtlasBoneGeometries([originBoneId, insertionBoneId]);
  const markers = useMemo(() => {
    const originBone = bones.get(originBoneId);
    const insertionBone = bones.get(insertionBoneId);
    if (!originBone || !insertionBone) return [];
    const sites = computeAttachmentSites(muscle, originBone, insertionBone);
    return sites ? buildAttachmentMarkers(sites) : [];
  }, [bones, insertionBoneId, muscle, originBoneId]);

  useLayoutEffect(() => {
    invalidate();
    return () => invalidate();
  }, [invalidate, markers]);

  const radius = MARKER_WORLD_RADIUS / stageScale;
  return (
    <group>
      {markers.map((marker) => (
        <mesh
          key={marker.role}
          name={`attachment-${marker.role}`}
          position={marker.position}
          renderOrder={100}
        >
          {marker.shape === 'sphere' ? (
            <sphereGeometry args={[radius, 20, 14]} />
          ) : (
            <octahedronGeometry args={[radius * 1.35]} />
          )}
          {/* Drawn over the muscle so an end on the far side stays visible while orbiting. */}
          <meshBasicMaterial
            attach="material"
            args={[{ color: marker.color, depthTest: false, transparent: true, opacity: 0.95 }]}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Marks where the studied muscle attaches: origin and insertion, on the drawn GLB mesh.
 * Rendered inside the region's staging group, so it shares the meshes' raw Z-Anatomy frame.
 */
export default function OriginInsertionGizmo({
  meshes,
  stageScale,
}: {
  meshes: readonly Mesh[];
  stageScale: number;
}): React.ReactElement | null {
  const mode = useMuscleStore((s) => s.mode);
  const focusedNodeId = useMuscleStore((s) => s.focusedNodeId);
  const selectedNodeId = useMuscleStore((s) => s.selectedNodeId);
  const showAttachments = useMuscleStore((s) => s.showAttachments);

  const nodeId = focusedNodeId ?? selectedNodeId;
  const node = nodeId ? getNodeById(nodeId) : undefined;
  const muscle = node ? meshes.find((mesh) => mesh.name === node.id) : undefined;

  if (
    mode !== 'warmup' ||
    !showAttachments ||
    !node?.originBoneId ||
    !node.insertionBoneId ||
    !muscle
  ) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <AttachmentMarkers
        muscle={muscle.geometry}
        originBoneId={node.originBoneId}
        insertionBoneId={node.insertionBoneId}
        stageScale={stageScale}
      />
    </Suspense>
  );
}
