import { useLayoutEffect, useMemo, useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { BufferGeometry, Mesh } from 'three';
import { DoubleSide, Mesh as ThreeMesh } from 'three';
import { muscleModelsManifest as manifest } from '../../types/muscleModelsManifest';
import { mergeSkinEnvelopeParts } from './mergeSkinEnvelopeGeometry';
import { ANATOMY_COLORS } from './anatomyVisuals';
import AnatomyHalfGroup from './AnatomyHalfGroup';
import { acquireSkinMaterial } from './anatomyMaterialPool';
import { alignSkinEnvelopeToStudyHalf } from './alignSkinEnvelopeGeometry';
import {
  clipSkinGeometryForReferenceHalf,
  clipSkinGeometryForStudyHalf,
} from './skinHalfClipOptions';
import { extractGlbMeshes } from './extractGlbMeshes';
import { setMuscleAnatomyDebugSkin, publishMuscleAnatomyDebugWindow } from '../../debug/muscleAnatomyDebugRegistry';
import { muscleRegionGlbUrl } from './muscleGlbUrl';
import { useMuscleGltf } from './muscleGltfLoader';

function isSkinMeshName(name: string): boolean {
  return name === 'skin_envelope' || name.startsWith('skin_');
}

function prepareSkinMeshes(meshes: Mesh[]): Mesh[] {
  const aligned = meshes.map((mesh) => {
    const geometry = alignSkinEnvelopeToStudyHalf(mesh.geometry.clone());
    const next = mesh.clone();
    next.geometry = geometry;
    return next;
  });

  if (aligned.length === 0) return aligned;

  const combined = mergeSkinEnvelopeParts(aligned.map((mesh) => mesh.geometry));
  if (!combined) return aligned;

  const merged = new ThreeMesh(combined, aligned[0]!.material);
  merged.name = 'skin_envelope';
  return [merged];
}

type SkinEnvelopeLayerProps = {
  layout: { position: [number, number, number]; scale: number };
  half: 'reference' | 'study';
  visible?: boolean;
};

function clipSkinForHalf(geometry: BufferGeometry, half: 'reference' | 'study'): BufferGeometry {
  return half === 'study'
    ? clipSkinGeometryForStudyHalf(geometry)
    : clipSkinGeometryForReferenceHalf(geometry);
}

function SkinMesh({ mesh, half }: { mesh: Mesh; half: 'reference' | 'study' }) {
  const { invalidate } = useThree();
  const meshRef = useRef<Mesh>(null);
  const material = useMemo(() => acquireSkinMaterial(), []);
  const isStudy = half === 'study';
  const geometry = useMemo(() => clipSkinForHalf(mesh.geometry, half), [half, mesh.geometry]);

  useLayoutEffect(() => {
    const skin = meshRef.current;
    if (skin) {
      skin.raycast = () => undefined;
      skin.frustumCulled = false;
    }
    material.color.set(ANATOMY_COLORS.skin);
    material.emissive.set('#3d2818');
    material.emissiveIntensity = isStudy ? 0.03 : 0.05;
    material.transparent = isStudy;
    material.opacity = isStudy ? 0.5 : 1;
    material.depthWrite = true;
    material.alphaTest = 0;
    material.polygonOffset = !isStudy;
    material.polygonOffsetFactor = isStudy ? 0 : -1;
    material.polygonOffsetUnits = isStudy ? 0 : -1;
    // Study transparent shell needs DoubleSide on concave ear/arm; reference −X mirror keeps DoubleSide too.
    material.side = DoubleSide;
    material.needsUpdate = true;
    invalidate();
  }, [half, invalidate, isStudy, material, mesh]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={mesh.position}
      rotation={mesh.rotation}
      scale={mesh.scale}
    />
  );
}

/** Z-Anatomy skin envelope — reference half baked onto −X (bakedMirror), study on +X. */
export default function SkinEnvelopeLayer({ layout, half, visible = true }: SkinEnvelopeLayerProps) {
  const { invalidate } = useThree();
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

  useEffect(() => {
    if (meshes.length > 0) invalidate();
  }, [invalidate, meshes]);

  if (!visible || meshes.length === 0) return null;

  return (
    <AnatomyHalfGroup half={half} layout={layout} renderOrder={half === 'reference' ? 50 : 60}>
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
