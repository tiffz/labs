import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { getNodeById } from '../../curriculum';
import AnatomyHalfGroup from './AnatomyHalfGroup';
import {
  computeAnatomyGroupTransform,
  computeStageOrbitTarget,
} from './extractGlbMeshes';
import GlbAnatomyMesh from './GlbAnatomyMesh';
import GlbAtlasMirrorMesh from './GlbAtlasMirrorMesh';
import SkinEnvelopeLayer from './SkinEnvelopeLayer';
import EyeGlobesLayer from './EyeGlobesLayer';
import { mergeFullBodyMeshes, useExtremityModuleMeshes } from './useExtremityModuleMeshes';
import { useCurriculumDetailMeshes } from './useCurriculumDetailMeshes';
import { useAtlasCompleteMeshes } from './useAtlasCompleteMeshes';
import { useHeadFaceAtlasMeshes } from './useHeadFaceAtlasMeshes';
import { isStudySkinVisibleAtPeel } from '../../layerDepthView';
import { useMuscleStore } from '../../store/useMuscleStore';

interface FullBodyRegionModelProps {
  onStageReady?: (center: [number, number, number]) => void;
}

export default function FullBodyRegionModel({ onStageReady }: FullBodyRegionModelProps) {
  const { invalidate } = useThree();
  const showSkinLayer = useMuscleStore((s) => s.showSkinLayer);
  const layerPeelDepth = useMuscleStore((s) => s.layerPeelDepth);
  const atlasMeshes = useAtlasCompleteMeshes();
  const headFaceMeshes = useHeadFaceAtlasMeshes();
  const curriculumDetailMeshes = useCurriculumDetailMeshes();
  const extremityMeshes = useExtremityModuleMeshes();
  const meshes = useMemo(
    () =>
      mergeFullBodyMeshes(
        atlasMeshes,
        headFaceMeshes,
        curriculumDetailMeshes,
        extremityMeshes,
      ),
    [atlasMeshes, curriculumDetailMeshes, extremityMeshes, headFaceMeshes],
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

  return (
    <>
      <SkinEnvelopeLayer layout={groupLayout} half="reference" visible />
      <EyeGlobesLayer layout={groupLayout} half="reference" visible />
      {isStudySkinVisibleAtPeel(layerPeelDepth, showSkinLayer) ? (
        <>
          <SkinEnvelopeLayer layout={groupLayout} half="study" visible />
          <EyeGlobesLayer layout={groupLayout} half="study" visible />
        </>
      ) : null}
      <AnatomyHalfGroup half="reference" layout={groupLayout}>
        {meshes.map((mesh) => {
          const node = getNodeById(mesh.name);
          if (!node) return null;
          return <GlbAtlasMirrorMesh key={`ref-${mesh.name}`} mesh={mesh} node={node} />;
        })}
      </AnatomyHalfGroup>
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
