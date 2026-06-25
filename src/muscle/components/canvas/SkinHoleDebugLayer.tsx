import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import AnatomyHalfGroup from './AnatomyHalfGroup';
import type { AnatomyGroupLayout } from './AnatomyHalfGroup';
import {
  buildInteriorHoleLoopSegmentPositions,
} from '../../anatomy/skinCoverageAudit';
import { useStudySkinEnvelopeGeometry } from './useStudySkinEnvelopeGeometry';

type SkinHoleDebugLayerProps = {
  layout: AnatomyGroupLayout;
};

/**
 * Magenta wireframe of significant skin holes on the opaque reference half.
 * `?debug=1&skinHoles=1` — delt/pec (≥14 edges), throat midline (≥8), trap dots (4–16).
 */
export default function SkinHoleDebugLayer({ layout }: SkinHoleDebugLayerProps) {
  const envelope = useStudySkinEnvelopeGeometry();
  const geometry = useMemo(() => {
    if (!envelope) return null;
    const positions = buildInteriorHoleLoopSegmentPositions(envelope, {
      minEdgeCount: 14,
      minDiameter: 0.012,
    });
    if (!positions) return null;
    const lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return lineGeometry;
  }, [envelope]);

  if (!geometry) return null;

  return (
    <AnatomyHalfGroup half="reference" layout={layout} renderOrder={26}>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial args={[{ color: '#ff00ff', depthTest: true, transparent: true, opacity: 0.95 }]} />
      </lineSegments>
    </AnatomyHalfGroup>
  );
}
