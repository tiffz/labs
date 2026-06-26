import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { getNodeById } from '../../curriculum';
import {
  publishMuscleAnatomyDebugWindow,
  setMuscleAnatomyDebugAnatomy,
} from '../../debug/muscleAnatomyDebugRegistry';
import AnatomyHalfGroup from './AnatomyHalfGroup';
import { alignAnatomyMeshToStudyHalf } from './alignSkinEnvelopeGeometry';
import {
  computeAnatomyGroupTransform,
  computeStageOrbitTarget,
} from './extractGlbMeshes';
import GlbAnatomyMesh from './GlbAnatomyMesh';
import GlbAtlasMirrorMesh from './GlbAtlasMirrorMesh';
import SkinEnvelopeLayer from './SkinEnvelopeLayer';
import SkinHoleDebugLayer from './SkinHoleDebugLayer';
import { mergeFullBodyMeshes, useExtremityModuleMeshes } from './useExtremityModuleMeshes';
import { useCurriculumDetailMeshes } from './useCurriculumDetailMeshes';
import { useFundamentalsMeshes } from './useFundamentalsMeshes';
import { useAtlasCompleteMeshes } from './useAtlasCompleteMeshes';
import { useHeadFaceAtlasMeshes } from './useHeadFaceAtlasMeshes';
import { isStudySkinVisibleAtPeel } from '../../layerDepthView';
import { useMuscleStore } from '../../store/useMuscleStore';
import { isLabsDebugEnabled, isMuscleSkinHolesDebugEnabled } from '../../../shared/debug/readLabsDebugParams';

interface FullBodyRegionModelProps {
  onStageReady?: (center: [number, number, number]) => void;
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
  const layerPeelDepth = useMuscleStore((s) => s.layerPeelDepth);
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

  useEffect(() => {
    if (meshes.length > 0) {
      invalidate();
      onStageReady?.(computeStageOrbitTarget(meshes, groupLayout));
    }
  }, [groupLayout, invalidate, meshes, onStageReady]);

  useEffect(() => {
    setMuscleAnatomyDebugAnatomy(meshes.map((mesh) => mesh.name));
    publishMuscleAnatomyDebugWindow();
  }, [meshes]);

  const hideReferenceAnatomy = isStudySkinVisibleAtPeel(layerPeelDepth);
  const showSkinHoleDebug =
    typeof window !== 'undefined' &&
    isLabsDebugEnabled(window.location.search) &&
    isMuscleSkinHolesDebugEnabled(window.location.search);

  return (
    <>
      <SkinEnvelopeLayer layout={groupLayout} half="reference" visible />
      {showSkinHoleDebug ? <SkinHoleDebugLayer layout={groupLayout} /> : null}
      {isStudySkinVisibleAtPeel(layerPeelDepth) ? (
        <>
          <SkinEnvelopeLayer layout={groupLayout} half="study" visible />
        </>
      ) : null}
      {hideReferenceAnatomy ? null : (
        <AnatomyHalfGroup half="reference" layout={groupLayout}>
          {meshes.map((mesh) => {
            const node = getNodeById(mesh.name);
            if (!node) return null;
            return <GlbAtlasMirrorMesh key={`ref-${mesh.name}`} mesh={mesh} node={node} />;
          })}
        </AnatomyHalfGroup>
      )}
      <AnatomyHalfGroup half="study" layout={groupLayout}>
        {meshes.map((mesh) => {
          const node = getNodeById(mesh.name);
          if (!node) return null;
          return <GlbAnatomyMesh key={mesh.name} mesh={mesh} node={node} />;
        })}
      </AnatomyHalfGroup>
    </>
  );
}
