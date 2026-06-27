import { describe, expect, it } from 'vitest';
import earShellBaseline from './earShellBaseline.json';
import { readRuntimeReferenceSkinEnvelope, readRuntimeStudySkinEnvelope } from './skinCoverageAuditNode';
import { auditEarShellForHalf, buildEarOpenBoundaryDebugSegmentPositions, countLateralEarOpenBoundaryEdges } from './earShellAudit';
import { auditGltfRuntimeSkinPipeline, loadAtlasSkinGltfScene } from './skinRuntimePipelineAudit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Max lateral open boundary edges — tighten toward earShellBaseline._target (0). */
const MAX_LATERAL_EAR_OPEN_EDGES = earShellBaseline.maxLateralOpenBoundaryEdges;

/** Max ray misses on auricular shell grid — tighten toward earShellBaseline._target (4). */
const MAX_EAR_RAY_MISSES = earShellBaseline._target.maxEarShellRayMissCount;

describe('earShellAudit', () => {
  it('does not regress lateral ear open edges vs baseline', () => {
    for (const [label, geo] of [
      ['study', readRuntimeStudySkinEnvelope()],
      ['reference', readRuntimeReferenceSkinEnvelope()],
    ] as const) {
      const open = countLateralEarOpenBoundaryEdges(geo);
      expect(
        open,
        `${label} lateral open boundary edges regressed above ${earShellBaseline.maxLateralOpenBoundaryEdges}`,
      ).toBeLessThanOrEqual(earShellBaseline.maxLateralOpenBoundaryEdges);
    }
  });

  it('does not regress ear shell raycast misses vs baseline', () => {
    for (const [label, geo] of [
      ['study', readRuntimeStudySkinEnvelope()],
      ['reference', readRuntimeReferenceSkinEnvelope()],
    ] as const) {
      const metrics = auditEarShellForHalf(geo, label);
      expect(metrics.rayMissCount).toBeLessThanOrEqual(earShellBaseline.maxEarShellRayMissCount);
    }
  });

  it('reference half auricular shell has no lateral open edges or ray misses', () => {
    const metrics = auditEarShellForHalf(readRuntimeReferenceSkinEnvelope(), 'reference');
    expect(
      metrics.lateralOpenBoundaryEdges,
      `lateral open boundary edges in ear band — use buildEarOpenBoundaryDebugSegmentPositions`,
    ).toBeLessThanOrEqual(MAX_LATERAL_EAR_OPEN_EDGES);
    expect(
      metrics.rayMissCount,
      `${metrics.rayMissCount}/${metrics.raySampleCount} ear shell ray misses`,
    ).toBeLessThanOrEqual(MAX_EAR_RAY_MISSES);
  });

  it('study half auricular shell has no lateral open edges or ray misses', () => {
    const metrics = auditEarShellForHalf(readRuntimeStudySkinEnvelope(), 'study');
    expect(metrics.lateralOpenBoundaryEdges).toBeLessThanOrEqual(MAX_LATERAL_EAR_OPEN_EDGES);
    expect(metrics.rayMissCount).toBeLessThanOrEqual(MAX_EAR_RAY_MISSES);
  });

  it('GLTF runtime path matches Node ear shell audit on reference half', async () => {
    const scene = await loadAtlasSkinGltfScene(REPO_ROOT);
    const pipeline = auditGltfRuntimeSkinPipeline(scene);
    const nodeRef = auditEarShellForHalf(readRuntimeReferenceSkinEnvelope(), 'reference');
    expect(pipeline.reference.lateralEarOpenBoundaryEdges).toBe(nodeRef.lateralOpenBoundaryEdges);
    expect(pipeline.reference.earShellRayMissCount).toBe(nodeRef.rayMissCount);
  });

  it('prints ear shell audit when MUSCLE_EAR_SHELL_AUDIT=1', () => {
    if (process.env.MUSCLE_EAR_SHELL_AUDIT !== '1') return;

    for (const [label, geo] of [
      ['study', readRuntimeStudySkinEnvelope()],
      ['reference', readRuntimeReferenceSkinEnvelope()],
    ] as const) {
      const metrics = auditEarShellForHalf(geo, label);
      const debug = buildEarOpenBoundaryDebugSegmentPositions(geo);
      console.info(
        `# ear shell ${label}: openEdges=${metrics.lateralOpenBoundaryEdges}, rayMiss=${metrics.rayMissCount}/${metrics.raySampleCount}, debugFloats=${debug?.length ?? 0}`,
      );
    }
  });
});
