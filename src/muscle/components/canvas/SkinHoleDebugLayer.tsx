import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import AnatomyHalfGroup from './AnatomyHalfGroup';
import type { AnatomyGroupLayout } from './AnatomyHalfGroup';
import {
  buildInteriorHoleLoopSegmentPositions,
  buildMidlineSeamGapSegmentPositions,
} from '../../anatomy/skinCoverageAudit';
import { useSkinEnvelopeGeometryForHalf } from './useStudySkinEnvelopeGeometry';

type SkinHoleDebugLayerProps = {
  layout: AnatomyGroupLayout;
};

function segmentGeometry(positions: Float32Array | null): BufferGeometry | null {
  if (!positions) return null;
  const lineGeometry = new BufferGeometry();
  lineGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return lineGeometry;
}

/**
 * Debug overlays for skin topology on both sagittal halves.
 * `?debug=1&skinHoles=1` on Full body peel depth 0:
 * - Magenta — significant interior holes (study half, ≥14 edges)
 * - Yellow — midline seam gaps (open boundary edges at |x| ≤ 0.028, per half)
 */
export default function SkinHoleDebugLayer({ layout }: SkinHoleDebugLayerProps) {
  const studyEnvelope = useSkinEnvelopeGeometryForHalf('study');
  const referenceEnvelope = useSkinEnvelopeGeometryForHalf('reference');

  const interiorGeometry = useMemo(
    () =>
      segmentGeometry(
        studyEnvelope
          ? buildInteriorHoleLoopSegmentPositions(studyEnvelope, {
              minEdgeCount: 14,
              minDiameter: 0.012,
            })
          : null,
      ),
    [studyEnvelope],
  );

  const studySeamGeometry = useMemo(
    () =>
      segmentGeometry(studyEnvelope ? buildMidlineSeamGapSegmentPositions(studyEnvelope) : null),
    [studyEnvelope],
  );

  const referenceSeamGeometry = useMemo(
    () =>
      segmentGeometry(
        referenceEnvelope ? buildMidlineSeamGapSegmentPositions(referenceEnvelope) : null,
      ),
    [referenceEnvelope],
  );

  if (!interiorGeometry && !studySeamGeometry && !referenceSeamGeometry) return null;

  return (
    <>
      {interiorGeometry ? (
        <AnatomyHalfGroup half="reference" layout={layout} renderOrder={26}>
          <lineSegments geometry={interiorGeometry}>
            <lineBasicMaterial args={[{ color: '#ff00ff', depthTest: true, transparent: true, opacity: 0.95 }]} />
          </lineSegments>
        </AnatomyHalfGroup>
      ) : null}
      {studySeamGeometry ? (
        <AnatomyHalfGroup half="study" layout={layout} renderOrder={27}>
          <lineSegments geometry={studySeamGeometry}>
            <lineBasicMaterial args={[{ color: '#ffcc00', depthTest: true, transparent: true, opacity: 0.9 }]} />
          </lineSegments>
        </AnatomyHalfGroup>
      ) : null}
      {referenceSeamGeometry ? (
        <AnatomyHalfGroup half="reference" layout={layout} renderOrder={27}>
          <lineSegments geometry={referenceSeamGeometry}>
            <lineBasicMaterial args={[{ color: '#ffcc00', depthTest: true, transparent: true, opacity: 0.9 }]} />
          </lineSegments>
        </AnatomyHalfGroup>
      ) : null}
    </>
  );
}
