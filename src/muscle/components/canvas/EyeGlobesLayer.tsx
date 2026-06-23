import { useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type { Mesh } from 'three';
import { DoubleSide, FrontSide } from 'three';
import { muscleModelsManifest as manifest } from '../../types/muscleModelsManifest';
import { ANATOMY_COLORS } from './anatomyVisuals';
import AnatomyHalfGroup from './AnatomyHalfGroup';
import { acquireEyeGlobeMaterial } from './anatomyMaterialPool';
import { extractGlbMeshes } from './extractGlbMeshes';
import { muscleRegionGlbUrl } from './muscleGlbUrl';
import { useMuscleGltf } from './muscleGltfLoader';

type EyeGlobesLayerProps = {
  layout: { position: [number, number, number]; scale: number };
  half: 'reference' | 'study';
  visible?: boolean;
};

function EyeGlobeMesh({ mesh, half }: { mesh: Mesh; half: 'reference' | 'study' }) {
  const { invalidate } = useThree();
  const meshRef = useRef<Mesh>(null);
  const material = useMemo(() => acquireEyeGlobeMaterial(), []);
  const isStudy = half === 'study';

  useLayoutEffect(() => {
    const eye = meshRef.current;
    if (eye) {
      eye.raycast = () => undefined;
    }
    material.color.set(ANATOMY_COLORS.eyeGlobe);
    material.emissive.set('#2a2218');
    material.emissiveIntensity = isStudy ? 0.02 : 0.04;
    material.transparent = isStudy;
    material.opacity = isStudy ? 0.85 : 1;
    material.depthWrite = !isStudy;
    material.side = half === 'reference' ? DoubleSide : FrontSide;
    material.needsUpdate = true;
    invalidate();
  }, [half, invalidate, isStudy, material]);

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

/** Z-Anatomy sclera + cornea — fills orbital voids on the skin half. */
export default function EyeGlobesLayer({ layout, half, visible = true }: EyeGlobesLayerProps) {
  const entry = manifest.regions.atlas_skin;
  const url = entry?.glbUrl
    ? muscleRegionGlbUrl(entry.glbUrl)
    : muscleRegionGlbUrl('/muscle/models/atlas_skin.glb');
  const { scene } = useMuscleGltf(url);
  const meshes = useMemo(
    () => extractGlbMeshes(scene, (name) => name === 'eye_globes'),
    [scene],
  );

  if (!visible || meshes.length === 0) return null;

  return (
    <AnatomyHalfGroup half={half} layout={layout} renderOrder={half === 'reference' ? 21 : 16}>
      {meshes.map((mesh) => (
        <EyeGlobeMesh key={`${half}-${mesh.name}`} mesh={mesh} half={half} />
      ))}
    </AnatomyHalfGroup>
  );
}
