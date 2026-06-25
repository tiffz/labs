import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import AnatomyHalfGroup from './AnatomyHalfGroup';
import type { AnatomyGroupLayout } from './AnatomyHalfGroup';
import { buildInteriorHoleLoopSegmentPositions } from '../../anatomy/skinCoverageAudit';
import { useStudySkinEnvelopeGeometry } from './useStudySkinEnvelopeGeometry';

type SkinHoleDebugLayerProps = {
  layout: AnatomyGroupLayout;
  half: 'reference' | 'study';
};

/** Magenta wireframe of interior skin holes in the platysma hotspot — `?debug=1&skinHoles=1`. */
export default function SkinHoleDebugLayer({ layout, half }: SkinHoleDebugLayerProps) {
  const envelope = useStudySkinEnvelopeGeometry();
  const geometry = useMemo(() => {
    if (!envelope) return null;
    const positions = buildInteriorHoleLoopSegmentPositions(envelope);
    if (!positions) return null;
    const lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return lineGeometry;
  }, [envelope]);

  if (!geometry) return null;

  return (
    <AnatomyHalfGroup half={half} layout={layout} renderOrder={40}>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial args={[{ color: '#ff00ff', depthTest: false, transparent: true, opacity: 0.95 }]} />
      </lineSegments>
    </AnatomyHalfGroup>
  );
}
