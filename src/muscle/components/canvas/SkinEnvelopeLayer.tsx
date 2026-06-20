import { useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type { Mesh } from 'three';
import { FrontSide, Mesh as ThreeMesh } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { muscleModelsManifest as manifest } from '../../types/muscleModelsManifest';
import { ANATOMY_COLORS } from './anatomyVisuals';
import AnatomyHalfGroup from './AnatomyHalfGroup';
import { acquireSkinMaterial } from './anatomyMaterialPool';
import { extractGlbMeshes } from './extractGlbMeshes';
import { muscleRegionGlbUrl } from './muscleGlbUrl';
import { useMuscleGltf } from './muscleGltfLoader';

function isSkinMeshName(name: string): boolean {
  return name === 'skin_envelope' || name.startsWith('skin_');
}

/** One continuous skin surface — avoids z-fighting and seams between GLB sub-meshes. */
function mergeSkinMeshes(meshes: Mesh[]): Mesh[] {
  if (meshes.length <= 1) return meshes;

  const combined = mergeGeometries(
    meshes.map((mesh) => mesh.geometry),
    false,
  );
  if (!combined) return meshes;

  combined.computeVertexNormals();
  const merged = new ThreeMesh(combined, meshes[0]!.material);
  merged.name = 'skin_envelope';
  return [merged];
}

type SkinEnvelopeLayerProps = {
  layout: { position: [number, number, number]; scale: number };
  half: 'reference' | 'study';
  visible?: boolean;
};

function SkinMesh({ mesh, half }: { mesh: Mesh; half: 'reference' | 'study' }) {
  const { invalidate } = useThree();
  const meshRef = useRef<Mesh>(null);
  const material = useMemo(() => acquireSkinMaterial(), []);
  const isStudy = half === 'study';

  useLayoutEffect(() => {
    const skin = meshRef.current;
    if (skin) {
      skin.raycast = () => undefined;
    }
    material.color.set(ANATOMY_COLORS.skin);
    material.emissive.set('#3d2818');
    material.emissiveIntensity = isStudy ? 0.03 : 0.05;
    material.transparent = isStudy;
    material.opacity = isStudy ? 0.42 : 1;
    material.depthWrite = !isStudy;
    material.side = FrontSide;
    material.needsUpdate = true;
    invalidate();
  }, [half, invalidate, isStudy, material, mesh]);

  return (
    <mesh
      ref={meshRef}
      geometry={mesh.geometry}
      material={material}
      position={mesh.position}
      rotation={mesh.rotation}
      scale={mesh.scale}
    />
  );
}

/** Z-Anatomy skin envelope — reference half mirrored across x=0. */
export default function SkinEnvelopeLayer({ layout, half, visible = true }: SkinEnvelopeLayerProps) {
  const entry = manifest.regions.atlas_skin;
  const url = entry?.glbUrl
    ? muscleRegionGlbUrl(entry.glbUrl)
    : muscleRegionGlbUrl('/muscle/models/atlas_skin.glb');
  const { scene } = useMuscleGltf(url);
  const meshes = useMemo(
    () => mergeSkinMeshes(extractGlbMeshes(scene, (name) => isSkinMeshName(name))),
    [scene],
  );

  if (!visible || meshes.length === 0) return null;

  return (
    <AnatomyHalfGroup half={half} layout={layout} renderOrder={half === 'reference' ? 20 : 15}>
      {meshes.map((mesh) => (
        <SkinMesh key={`${half}-${mesh.name}`} mesh={mesh} half={half} />
      ))}
    </AnatomyHalfGroup>
  );
}
