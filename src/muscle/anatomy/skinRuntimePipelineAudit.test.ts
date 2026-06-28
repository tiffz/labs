import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import coverageBaseline from './skinCoverageBaseline.json';
import earShellBaseline from './earShellBaseline.json';
import {
  auditGltfRuntimeSkinPipeline,
  earBandMetrics,
  loadAtlasSkinGltfScene,
  palmBandMetrics,
} from './skinRuntimePipelineAudit';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Magenta overlay segment count — unwelded glTF primitive seams spike to ~6000; one 14-edge palm loop = 84. */
const WELDED_STUDY_DEBUG_SEGMENT_FLOATS_MAX = 84;

describe('skinRuntimePipelineAudit', () => {
  it(
    'GLTFLoader runtime path has zero auricular debug loops on both halves',
    async () => {
    const scene = await loadAtlasSkinGltfScene(REPO_ROOT);
    const audit = auditGltfRuntimeSkinPipeline(scene);

    expect(
      audit.study.earDebugLoops,
      'study half still has fake ear loops from unwelded glTF primitive seams',
    ).toBe(0);
    expect(
      audit.reference.earDebugLoops,
      'reference half still has fake ear loops from unwelded glTF primitive seams',
    ).toBe(0);

    for (const halfMetrics of [audit.study, audit.reference]) {
      const earBand = earBandMetrics(halfMetrics);
      expect(earBand, `${halfMetrics.half} earLateral band missing`).toBeDefined();
      expect(
        earBand!.interiorLoopCount,
        `${halfMetrics.half} earLateral interior loops`,
      ).toBeLessThanOrEqual(coverageBaseline.maxInteriorLoopsByBand.earLateral);
      expect(
        halfMetrics.lateralEarOpenBoundaryEdges,
        `${halfMetrics.half} lateral ear open boundary edges (orange overlay)`,
      ).toBeLessThanOrEqual(earShellBaseline.maxLateralOpenBoundaryEdges);
      expect(
        halfMetrics.earShellRayMissCount,
        `${halfMetrics.half} ear shell ray misses`,
      ).toBeLessThanOrEqual(earShellBaseline._target.maxEarShellRayMissCount);
    }
  },
    30_000,
  );

  it(
    'GLTFLoader runtime debug overlay matches Node audit weld (no normal-attribute seam regression)',
    async () => {
    const scene = await loadAtlasSkinGltfScene(REPO_ROOT);
    const audit = auditGltfRuntimeSkinPipeline(scene);

    expect(audit.auditStudyEarDebugLoops).toBe(0);
    expect(
      audit.study.significantInteriorLoops,
      'study significant interior loops (magenta ≥14 edges) — palm cuff hole until re-export',
    ).toBeLessThanOrEqual(1);
    expect(audit.reference.significantInteriorLoops).toBe(0);
    expect(audit.study.debugSegmentFloats).toBeLessThanOrEqual(WELDED_STUDY_DEBUG_SEGMENT_FLOATS_MAX);
    expect(audit.reference.debugSegmentFloats).toBeLessThanOrEqual(WELDED_STUDY_DEBUG_SEGMENT_FLOATS_MAX);
    expect(audit.study.debugSegmentFloats).toBe(audit.auditStudyDebugSegmentFloats);

    const palmBand = palmBandMetrics(audit.study);
    expect(palmBand?.interiorLoopCount ?? 0).toBeLessThanOrEqual(
      coverageBaseline.maxInteriorLoopsByBand.palmWrist,
    );
  },
    30_000,
  );

  it('prints runtime pipeline audit when MUSCLE_SKIN_RUNTIME_AUDIT=1', async () => {
    if (process.env.MUSCLE_SKIN_RUNTIME_AUDIT !== '1') return;

    const scene = await loadAtlasSkinGltfScene(REPO_ROOT);
    const audit = auditGltfRuntimeSkinPipeline(scene);

    console.info('# GLTF runtime skin pipeline audit');
    for (const halfMetrics of [audit.study, audit.reference]) {
      const earBand = earBandMetrics(halfMetrics);
      const palmBand = palmBandMetrics(halfMetrics);
      console.info(
        `- ${halfMetrics.half}: earDbg=${halfMetrics.earDebugLoops}, sigLoops=${halfMetrics.significantInteriorLoops}, interior=${halfMetrics.interiorLoopCount}, magentaFloats=${halfMetrics.debugSegmentFloats}, earOpen=${halfMetrics.lateralEarOpenBoundaryEdges}, earRayMiss=${halfMetrics.earShellRayMissCount}/${halfMetrics.earShellRaySampleCount}, palmLoops=${palmBand?.interiorLoopCount ?? 0}, earTris=${earBand?.triangleCount ?? 0}`,
      );
    }
    console.info(
      `- audit study parity: earDbg=${audit.auditStudyEarDebugLoops}, magentaFloats=${audit.auditStudyDebugSegmentFloats}`,
    );
  });
});
