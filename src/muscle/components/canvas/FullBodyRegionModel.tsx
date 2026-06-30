import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Plane, Vector3 } from 'three';
import { getNodeById } from '../../curriculum';
import {
  publishMuscleAnatomyDebugWindow,
  setMuscleAnatomyDebugAnatomy,
} from '../../debug/muscleAnatomyDebugRegistry';
import AnatomyHalfGroup from './AnatomyHalfGroup';
import { alignAnatomyMeshToStudyHalf } from './alignAnatomyMeshGeometry';
import {
  computeAnatomyGroupTransform,
  computeStageFrame,
} from './extractGlbMeshes';
import GlbAnatomyMesh from './GlbAnatomyMesh';
import GlbAtlasMirrorMesh from './GlbAtlasMirrorMesh';
import { mergeFullBodyMeshes, useExtremityModuleMeshes } from './useExtremityModuleMeshes';
import { useCurriculumDetailMeshes } from './useCurriculumDetailMeshes';
import { useFundamentalsMeshes } from './useFundamentalsMeshes';
import { useAtlasCompleteMeshes } from './useAtlasCompleteMeshes';
import { useHeadFaceAtlasMeshes } from './useHeadFaceAtlasMeshes';
import ReferenceHalfHitZone from './ReferenceHalfHitZone';
import type { AnatomyStageFrame } from '../../types/anatomyStageFrame';

interface FullBodyRegionModelProps {
  onStageReady?: (frame: AnatomyStageFrame) => void;
}

/** Z-Anatomy .r exports often land on −X; mirror to +X local so study (+scale) shows cross-section, not sagittal edge. */
function alignFullBodyAnatomyMeshes(meshes: ReturnType<typeof mergeFullBodyMeshes>) {
  return meshes.map((mesh) => {
    const aligned = mesh.clone();
    aligned.geometry = alignAnatomyMeshToStudyHalf(mesh.geometry.clone());
    return aligned;
  });
}

export default function FullBodyRegionModel({ onStageReady }: FullBodyRegionModelProps) {
  const { invalidate } = useThree();
  const atlasMeshes = useAtlasCompleteMeshes();
  const headFaceMeshes = useHeadFaceAtlasMeshes();
  const fundamentalsMeshes = useFundamentalsMeshes();
  const curriculumDetailMeshes = useCurriculumDetailMeshes();
  const extremityMeshes = useExtremityModuleMeshes();
  const meshes = useMemo(
    () =>
      alignFullBodyAnatomyMeshes(
        mergeFullBodyMeshes(
          atlasMeshes,
          headFaceMeshes,
          fundamentalsMeshes,
          curriculumDetailMeshes,
          extremityMeshes,
        ),
      ),
    [atlasMeshes, curriculumDetailMeshes, extremityMeshes, fundamentalsMeshes, headFaceMeshes],
  );
  const groupLayout = useMemo(
    () => computeAnatomyGroupTransform(meshes, { sagittalSplit: true }),
    [meshes],
  );

  // Hard-cut both halves at the sagittal plane (world x = layout.position.x, where local x=0 lands)
  // so midline-straddling meshes (e.g. the Diaphragm) can't bleed across into the other half. A
  // small outward epsilon keeps each half's cut face intact while still trimming real bleed.
  const { studyClip, referenceClip } = useMemo(() => {
    const sagittalX = groupLayout.position[0];
    const eps = 0.004;
    return {
      // Study keeps world x ≥ sagittalX − eps.
      studyClip: new Plane(new Vector3(1, 0, 0), -(sagittalX - eps)),
      // Reference keeps world x ≤ sagittalX + eps.
      referenceClip: new Plane(new Vector3(-1, 0, 0), sagittalX + eps),
    };
  }, [groupLayout]);

  useEffect(() => {
    if (meshes.length > 0) {
      invalidate();
      onStageReady?.(computeStageFrame(meshes, groupLayout));
    }
  }, [groupLayout, invalidate, meshes, onStageReady]);

  useEffect(() => {
    setMuscleAnatomyDebugAnatomy(meshes.map((mesh) => mesh.name));
    publishMuscleAnatomyDebugWindow();
  }, [meshes]);

  return (
    <>
      {/* Écorché reference half — the complete human: every muscle layered over every bone, fixed at
          full depth (peel-independent) as a constant anatomical anchor while the study half peels. */}
      <AnatomyHalfGroup half="reference" layout={groupLayout}>
        {meshes.map((mesh) => {
          const node = getNodeById(mesh.name);
          if (!node) return null;
          return (
            <GlbAtlasMirrorMesh key={`ref-${mesh.name}`} mesh={mesh} node={node} clippingPlane={referenceClip} />
          );
        })}
      </AnatomyHalfGroup>
      {/* Study half — full muscle figure, peeled by the depth slider down to the skeleton. */}
      <AnatomyHalfGroup half="study" layout={groupLayout}>
        {meshes.map((mesh) => {
          const node = getNodeById(mesh.name);
          if (!node) return null;
          return <GlbAnatomyMesh key={mesh.name} mesh={mesh} node={node} clippingPlane={studyClip} />;
        })}
      </AnatomyHalfGroup>
      <ReferenceHalfHitZone />
    </>
  );
}
