import { useLayoutEffect, useMemo, useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { BufferGeometry, Mesh } from 'three';
import { DoubleSide, FrontSide, Mesh as ThreeMesh } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { muscleModelsManifest as manifest } from '../../types/muscleModelsManifest';
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

  const bodyMeshes = aligned.filter((mesh) => mesh.name !== 'skin_ear');
  if (bodyMeshes.length === 0) return aligned;
  if (bodyMeshes.length === 1) return bodyMeshes;

  const combined = mergeGeometries(
    bodyMeshes.map((mesh) => mesh.geometry),
    false,
  );
  if (!combined) return bodyMeshes;

  combined.computeVertexNormals();
  const merged = new ThreeMesh(combined, bodyMeshes[0]!.material);
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
    }
    const isStudy = half === 'study';
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
    material.side = isStudy ? DoubleSide : FrontSide;
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
    <AnatomyHalfGroup half={half} layout={layout} renderOrder={half === 'reference' ? 25 : 40}>
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
