import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import AnatomyHalfGroup from './AnatomyHalfGroup';
import type { AnatomyGroupLayout } from './AnatomyHalfGroup';
import {
  buildMidlineSeamGapSegmentPositions,
  buildSkinHoleDebugSegmentPositions,
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
 * - Magenta — interior holes on **each half's own clip** (never mirror study loops onto reference)
 * - Yellow — midline seam gaps (open boundary edges at |x| ≤ 0.028, per half)
 *
 * Study palmar voids use relaxed 8+ edge debug threshold (transparent shell).
 */
export default function SkinHoleDebugLayer({ layout }: SkinHoleDebugLayerProps) {
  const studyEnvelope = useSkinEnvelopeGeometryForHalf('study');
  const referenceEnvelope = useSkinEnvelopeGeometryForHalf('reference');

  const studyInteriorGeometry = useMemo(
    () =>
      segmentGeometry(
        studyEnvelope
          ? buildSkinHoleDebugSegmentPositions(studyEnvelope, { includePalmarRelaxed: true })
          : null,
      ),
    [studyEnvelope],
  );

  const referenceInteriorGeometry = useMemo(
    () =>
      segmentGeometry(
        referenceEnvelope
          ? buildSkinHoleDebugSegmentPositions(referenceEnvelope, { includePalmarRelaxed: false })
          : null,
      ),
    [referenceEnvelope],
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

  if (
    !studyInteriorGeometry &&
    !referenceInteriorGeometry &&
    !studySeamGeometry &&
    !referenceSeamGeometry
  ) {
    return null;
  }

  return (
    <>
      {studyInteriorGeometry ? (
        <AnatomyHalfGroup half="study" layout={layout} renderOrder={26}>
          <lineSegments geometry={studyInteriorGeometry}>
            <lineBasicMaterial args={[{ color: '#ff00ff', depthTest: true, transparent: true, opacity: 0.95 }]} />
          </lineSegments>
        </AnatomyHalfGroup>
      ) : null}
      {referenceInteriorGeometry ? (
        <AnatomyHalfGroup half="reference" layout={layout} renderOrder={26}>
          <lineSegments geometry={referenceInteriorGeometry}>
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
