import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import AnatomyHalfGroup from './AnatomyHalfGroup';
import type { AnatomyGroupLayout } from './AnatomyHalfGroup';
import {
  buildMidlineSeamGapSegmentPositions,
  buildPalmarEminenceDiagnosticSegmentPositions,
  buildSkinHoleDebugSegmentPositions,
} from '../../anatomy/skinCoverageAudit';
import { buildEarOpenBoundaryDebugSegmentPositions } from '../../anatomy/earShellAudit';
import { buildGlTfSlitOpenBoundaryDebugSegmentPositions } from '../../anatomy/skinLimbSlitAudit';
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
 * - Magenta — interior holes + relaxed palmar / eminence / ear pinholes (both halves)
 * - Orange — lateral ear open boundary edges (attachment seam + helix gaps; not interior loops)
 * - Lime — glTF primitive slits in ear + limb seal bands (open boundary edges; not interior loops)
 * - Cyan — thenar + hypothenar coverage boxes when triangle count is below floor
 * - Yellow — midline seam gaps (open boundary edges at |x| ≤ 0.028, per half)
 *
 * Palmar note: visible palm voids often sit on **thenar/hypothenar eminence pads** (patch junction
 * or missing shell). Cyan boxes mark those pads; magenta marks boundary loops when they exist.
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
          ? buildSkinHoleDebugSegmentPositions(referenceEnvelope, { includePalmarRelaxed: true })
          : null,
      ),
    [referenceEnvelope],
  );

  const studyPalmarDiagnosticGeometry = useMemo(
    () =>
      segmentGeometry(
        studyEnvelope ? buildPalmarEminenceDiagnosticSegmentPositions(studyEnvelope) : null,
      ),
    [studyEnvelope],
  );

  const referencePalmarDiagnosticGeometry = useMemo(
    () =>
      segmentGeometry(
        referenceEnvelope ? buildPalmarEminenceDiagnosticSegmentPositions(referenceEnvelope) : null,
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

  const studyEarOpenBoundaryGeometry = useMemo(
    () =>
      segmentGeometry(
        studyEnvelope ? buildEarOpenBoundaryDebugSegmentPositions(studyEnvelope) : null,
      ),
    [studyEnvelope],
  );

  const referenceEarOpenBoundaryGeometry = useMemo(
    () =>
      segmentGeometry(
        referenceEnvelope ? buildEarOpenBoundaryDebugSegmentPositions(referenceEnvelope) : null,
      ),
    [referenceEnvelope],
  );

  const studyGlTfSlitGeometry = useMemo(
    () =>
      segmentGeometry(
        studyEnvelope ? buildGlTfSlitOpenBoundaryDebugSegmentPositions(studyEnvelope) : null,
      ),
    [studyEnvelope],
  );

  const referenceGlTfSlitGeometry = useMemo(
    () =>
      segmentGeometry(
        referenceEnvelope ? buildGlTfSlitOpenBoundaryDebugSegmentPositions(referenceEnvelope) : null,
      ),
    [referenceEnvelope],
  );

  if (
    !studyInteriorGeometry &&
    !referenceInteriorGeometry &&
    !studyPalmarDiagnosticGeometry &&
    !referencePalmarDiagnosticGeometry &&
    !studySeamGeometry &&
    !referenceSeamGeometry &&
    !studyEarOpenBoundaryGeometry &&
    !referenceEarOpenBoundaryGeometry &&
    !studyGlTfSlitGeometry &&
    !referenceGlTfSlitGeometry
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
      {studyPalmarDiagnosticGeometry ? (
        <AnatomyHalfGroup half="study" layout={layout} renderOrder={28}>
          <lineSegments geometry={studyPalmarDiagnosticGeometry}>
            <lineBasicMaterial args={[{ color: '#00e5ff', depthTest: true, transparent: true, opacity: 0.95 }]} />
          </lineSegments>
        </AnatomyHalfGroup>
      ) : null}
      {referencePalmarDiagnosticGeometry ? (
        <AnatomyHalfGroup half="reference" layout={layout} renderOrder={28}>
          <lineSegments geometry={referencePalmarDiagnosticGeometry}>
            <lineBasicMaterial args={[{ color: '#00e5ff', depthTest: true, transparent: true, opacity: 0.95 }]} />
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
      {studyEarOpenBoundaryGeometry ? (
        <AnatomyHalfGroup half="study" layout={layout} renderOrder={29}>
          <lineSegments geometry={studyEarOpenBoundaryGeometry}>
            <lineBasicMaterial args={[{ color: '#ff6600', depthTest: true, transparent: true, opacity: 0.95 }]} />
          </lineSegments>
        </AnatomyHalfGroup>
      ) : null}
      {referenceEarOpenBoundaryGeometry ? (
        <AnatomyHalfGroup half="reference" layout={layout} renderOrder={29}>
          <lineSegments geometry={referenceEarOpenBoundaryGeometry}>
            <lineBasicMaterial args={[{ color: '#ff6600', depthTest: true, transparent: true, opacity: 0.95 }]} />
          </lineSegments>
        </AnatomyHalfGroup>
      ) : null}
      {studyGlTfSlitGeometry ? (
        <AnatomyHalfGroup half="study" layout={layout} renderOrder={30}>
          <lineSegments geometry={studyGlTfSlitGeometry}>
            <lineBasicMaterial args={[{ color: '#66ff00', depthTest: true, transparent: true, opacity: 0.95 }]} />
          </lineSegments>
        </AnatomyHalfGroup>
      ) : null}
      {referenceGlTfSlitGeometry ? (
        <AnatomyHalfGroup half="reference" layout={layout} renderOrder={30}>
          <lineSegments geometry={referenceGlTfSlitGeometry}>
            <lineBasicMaterial args={[{ color: '#66ff00', depthTest: true, transparent: true, opacity: 0.95 }]} />
          </lineSegments>
        </AnatomyHalfGroup>
      ) : null}
    </>
  );
}
