import { useLayoutEffect, useMemo, useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { Mesh } from 'three';
import { DoubleSide, FrontSide, Mesh as ThreeMesh } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { muscleModelsManifest as manifest } from '../../types/muscleModelsManifest';
import { ANATOMY_COLORS } from './anatomyVisuals';
import AnatomyHalfGroup from './AnatomyHalfGroup';
import { acquireSkinMaterial } from './anatomyMaterialPool';
import { clipSkinGeometryToStudyHalf } from './clipSkinToStudyHalf';
import { extractGlbMeshes } from './extractGlbMeshes';
import { setMuscleAnatomyDebugSkin, publishMuscleAnatomyDebugWindow } from '../../debug/muscleAnatomyDebugRegistry';
import { muscleRegionGlbUrl } from './muscleGlbUrl';
import { useMuscleGltf } from './muscleGltfLoader';

function isSkinMeshName(name: string): boolean {
  return name === 'skin_envelope' || name.startsWith('skin_');
}

function prepareSkinMeshes(meshes: Mesh[]): Mesh[] {
  const clipped = meshes.map((mesh) => {
    const geometry = clipSkinGeometryToStudyHalf(mesh.geometry.clone());
    const next = mesh.clone();
    next.geometry = geometry;
    return next;
  });
  if (clipped.length <= 1) return clipped;

  const combined = mergeGeometries(
    clipped.map((mesh) => mesh.geometry),
    false,
  );
  if (!combined) return clipped;

  combined.computeVertexNormals();
  const merged = new ThreeMesh(combined, clipped[0]!.material);
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
    material.opacity = isStudy ? 0.52 : 1;
    material.depthWrite = !isStudy;
    material.alphaTest = isStudy ? 0.08 : 0;
    material.polygonOffset = true;
    material.polygonOffsetFactor = -1;
    material.polygonOffsetUnits = -1;
    // Study half: single-sided + clip removes midline pelvis bleed onto the anatomy side.
    material.side = isStudy ? FrontSide : DoubleSide;
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
  const extracted = useMemo(
    () => extractGlbMeshes(scene, (name) => isSkinMeshName(name)),
    [scene],
  );
  const meshes = useMemo(() => prepareSkinMeshes(extracted), [extracted]);

  useEffect(() => {
    setMuscleAnatomyDebugSkin(extracted.map((mesh) => mesh.name));
    publishMuscleAnatomyDebugWindow();
  }, [extracted]);

  if (!visible || meshes.length === 0) return null;

    return (
    <AnatomyHalfGroup half={half} layout={layout} renderOrder={half === 'reference' ? 25 : 30}>
      {meshes.map((mesh) => (
        <SkinMesh
          key={`${half}-${mesh.name}`}
          mesh={mesh}
          half={half}
        />
      ))}
    </AnatomyHalfGroup>
  );
}
