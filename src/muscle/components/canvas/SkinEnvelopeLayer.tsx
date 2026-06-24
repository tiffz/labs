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
import { clipSkinGeometryToStudyHalf } from './clipSkinToStudyHalf';
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
  if (aligned.length <= 1) return aligned;

  const combined = mergeGeometries(
    aligned.map((mesh) => mesh.geometry),
    false,
  );
  if (!combined) return aligned;

  combined.computeVertexNormals();
  const merged = new ThreeMesh(combined, aligned[0]!.material);
  merged.name = 'skin_envelope';
  return [merged];
}

type SkinEnvelopeLayerProps = {
  layout: { position: [number, number, number]; scale: number };
  half: 'reference' | 'study';
  visible?: boolean;
};

function clipSkinForHalf(geometry: BufferGeometry): BufferGeometry {
  return clipSkinGeometryToStudyHalf(geometry.clone(), 0, {
    anyVertexOnHalf: true,
    preserveMidlinePelvis: true,
    preserveMidlineThorax: true,
    preserveMidlineFace: true,
    preserveMidlineAnteriorNeck: true,
  });
}

function SkinMesh({ mesh, half }: { mesh: Mesh; half: 'reference' | 'study' }) {
  const { invalidate } = useThree();
  const meshRef = useRef<Mesh>(null);
  const material = useMemo(() => acquireSkinMaterial(), []);
  const isStudy = half === 'study';
  const geometry = useMemo(() => clipSkinForHalf(mesh.geometry), [mesh.geometry]);

  useLayoutEffect(() => {
    const skin = meshRef.current;
    if (skin) {
      skin.raycast = () => undefined;
    }
    material.color.set(ANATOMY_COLORS.skin);
    material.emissive.set('#3d2818');
    material.emissiveIntensity = isStudy ? 0.03 : 0.05;
    material.transparent = isStudy;
    material.opacity = isStudy ? 0.5 : 1;
    material.depthWrite = !isStudy;
    // alphaTest on study skin punched holes over curved pecs (muscle bleed-through = patchy dark).
    material.alphaTest = 0;
    material.polygonOffset = !isStudy;
    material.polygonOffsetFactor = isStudy ? 0 : -1;
    material.polygonOffsetUnits = isStudy ? 0 : -1;
    // Study half: single-sided + clip removes midline pelvis bleed onto the anatomy side.
    material.side = isStudy ? FrontSide : DoubleSide;
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
