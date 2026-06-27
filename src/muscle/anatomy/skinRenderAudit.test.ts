import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import renderBaseline from './skinRenderBaseline.json';
import { buildSkinRenderAuditMetrics } from './skinRenderAudit';
import { loadAtlasSkinGltfScene } from './skinRuntimePipelineAudit';
import {
  buildAlignedWeldedSkinEnvelopeFromScene,
  buildClippedSkinEnvelopeForHalfFromScene,
  collectSkinEnvelopePartsFromScene,
} from '../components/canvas/skinEnvelopeRuntimeGeometry';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

describe('skinRenderAudit', () => {
  it('GLTF runtime weld produces non-empty clipped skin on both halves', async () => {
    const scene = await loadAtlasSkinGltfScene(REPO_ROOT);
    const parts = collectSkinEnvelopePartsFromScene(scene);
    const welded = buildAlignedWeldedSkinEnvelopeFromScene(scene);
    const study = buildClippedSkinEnvelopeForHalfFromScene(scene, 'study');
    const reference = buildClippedSkinEnvelopeForHalfFromScene(scene, 'reference');

    const metrics = buildSkinRenderAuditMetrics(parts.length, welded, study, reference);

    expect(parts.length, 'skin_envelope_* primitive count').toBeGreaterThanOrEqual(
      renderBaseline.minEnvelopePartCount,
    );
    expect(metrics.weldedReady, 'welded envelope must exist for render').toBe(true);
    expect(metrics.weldError).toBeNull();
    expect(metrics.weldedTriangleCount).toBeGreaterThanOrEqual(renderBaseline.minWeldedTriangleCount);
    expect(metrics.studyClippedTriangleCount).toBeGreaterThanOrEqual(
      renderBaseline.minClippedStudyTriangleCount,
    );
    expect(metrics.referenceClippedTriangleCount).toBeGreaterThanOrEqual(
      renderBaseline.minClippedReferenceTriangleCount,
    );
  });
});
