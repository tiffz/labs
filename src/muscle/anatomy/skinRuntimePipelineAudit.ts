import fs from 'node:fs';
import path from 'node:path';
import type { BufferAttribute, BufferGeometry, Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  buildClippedSkinEnvelopeForHalfFromScene,
} from '../components/canvas/skinEnvelopeRuntimeGeometry';
import {
  auditSkinCoverageBands,
  buildSkinHoleDebugSegmentPositions,
  findBoundaryLoops,
  isEarLateralDebugHoleLoop,
  isInteriorSkinHoleLoop,
  isSignificantVisibleSkinHoleLoop,
  type SkinCoverageBandMetrics,
} from './skinCoverageAudit';
import { auditEarShellForHalf } from './earShellAudit';
import { readRuntimeStudySkinEnvelope } from './skinCoverageAuditNode';
import { SKIN_GLB_PATH } from './skinGlbEnvelopeReader';

export type SkinRuntimeHalfMetrics = {
  half: 'reference' | 'study';
  earDebugLoops: number;
  significantInteriorLoops: number;
  interiorLoopCount: number;
  debugSegmentFloats: number;
  weldedVertexCount: number;
  lateralEarOpenBoundaryEdges: number;
  earShellRayMissCount: number;
  earShellRaySampleCount: number;
  coverageBands: SkinCoverageBandMetrics[];
};

export type SkinRuntimePipelineAudit = {
  study: SkinRuntimeHalfMetrics;
  reference: SkinRuntimeHalfMetrics;
  auditStudyDebugSegmentFloats: number;
  auditStudyEarDebugLoops: number;
};

function countEarDebugLoops(geometry: BufferGeometry): number {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  if (!position) return 0;
  return findBoundaryLoops(geometry).filter((loop) =>
    isEarLateralDebugHoleLoop(loop, position),
  ).length;
}

function countSignificantInteriorLoops(geometry: BufferGeometry): number {
  const position = geometry.getAttribute('position') as BufferAttribute | undefined;
  if (!position) return 0;
  return findBoundaryLoops(geometry).filter((loop) =>
    isSignificantVisibleSkinHoleLoop(loop, position, { minEdgeCount: 14, minDiameter: 0.012 }),
  ).length;
}

function metricsForHalf(
  geometry: BufferGeometry,
  half: 'reference' | 'study',
): SkinRuntimeHalfMetrics {
  const interiorLoops = findBoundaryLoops(geometry).filter(isInteriorSkinHoleLoop);
  const earShell = auditEarShellForHalf(geometry, half);
  return {
    half,
    earDebugLoops: countEarDebugLoops(geometry),
    significantInteriorLoops: countSignificantInteriorLoops(geometry),
    interiorLoopCount: interiorLoops.length,
    debugSegmentFloats: buildSkinHoleDebugSegmentPositions(geometry)?.length ?? 0,
    weldedVertexCount: geometry.getAttribute('position')?.count ?? 0,
    lateralEarOpenBoundaryEdges: earShell.lateralOpenBoundaryEdges,
    earShellRayMissCount: earShell.rayMissCount,
    earShellRaySampleCount: earShell.raySampleCount,
    coverageBands: auditSkinCoverageBands(geometry),
  };
}

/** Load atlas_skin.glb the same way the Muscle viewport does (Three GLTFLoader). */
export async function loadAtlasSkinGltfScene(
  repoRoot: string,
  glbRelativePath = SKIN_GLB_PATH,
): Promise<Group> {
  const glbPath = path.join(repoRoot, glbRelativePath);
  const fileBytes = new Uint8Array(fs.readFileSync(glbPath));
  const arrayBuffer = fileBytes.buffer.slice(
    fileBytes.byteOffset,
    fileBytes.byteOffset + fileBytes.byteLength,
  );

  const gltf = await new Promise<{ scene: Group }>((resolve, reject) => {
    new GLTFLoader().parse(arrayBuffer, '', (loaded) => resolve(loaded), reject);
  });

  return gltf.scene;
}

/** Full runtime path: GLTFLoader → extract/weld → align → sagittal clip (both halves). */
export function auditGltfRuntimeSkinPipeline(scene: Group): SkinRuntimePipelineAudit {
  const studyGeometry = buildClippedSkinEnvelopeForHalfFromScene(scene, 'study');
  const referenceGeometry = buildClippedSkinEnvelopeForHalfFromScene(scene, 'reference');
  if (!studyGeometry || !referenceGeometry) {
    throw new Error('skin_envelope missing from GLTF scene after runtime weld path');
  }

  const auditStudy = readRuntimeStudySkinEnvelope();
  return {
    study: metricsForHalf(studyGeometry, 'study'),
    reference: metricsForHalf(referenceGeometry, 'reference'),
    auditStudyDebugSegmentFloats: buildSkinHoleDebugSegmentPositions(auditStudy)?.length ?? 0,
    auditStudyEarDebugLoops: countEarDebugLoops(auditStudy),
  };
}

export function palmBandMetrics(metrics: SkinRuntimeHalfMetrics): SkinCoverageBandMetrics | undefined {
  return metrics.coverageBands.find((band) => band.id === 'palmWrist');
}

export function earBandMetrics(metrics: SkinRuntimeHalfMetrics): SkinCoverageBandMetrics | undefined {
  return metrics.coverageBands.find((band) => band.id === 'earLateral');
}
