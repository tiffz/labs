import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { readGlbSkinEnvelopeGeometry, SKIN_GLB_PATH } from '../../anatomy/skinGlbEnvelopeReader';
import { readSkinEnvelopePrimitiveParts } from '../../anatomy/skinEnvelopePrimitiveParts.testutil';
import { isEarLateralDebugHoleLoop, findBoundaryLoops } from '../../anatomy/skinCoverageAudit';
import { alignSkinEnvelopeToStudyHalf } from './alignSkinEnvelopeGeometry';
import { clipSkinGeometryForStudyHalf } from './skinHalfClipOptions';
import { extractGlbMeshes } from './extractGlbMeshes';
import { mergeSkinEnvelopeParts } from './mergeSkinEnvelopeGeometry';
import { collectSkinEnvelopePartsFromScene } from './skinEnvelopeRuntimeGeometry';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

function countEarDebugLoops(geometry: BufferGeometry): number {
  const aligned = clipSkinGeometryForStudyHalf(alignSkinEnvelopeToStudyHalf(geometry.clone()));
  const position = aligned.getAttribute('position')!;
  return findBoundaryLoops(aligned).filter((loop) => isEarLateralDebugHoleLoop(loop, position)).length;
}

describe('mergeSkinEnvelopeGeometry', () => {
  it('welds glTF primitive seams to match audit reader (ear interior loops)', () => {
    const welded = mergeSkinEnvelopeParts([readGlbSkinEnvelopeGeometry()])!;
    expect(countEarDebugLoops(welded)).toBe(0);
  });

  it('mergeSkinEnvelopeParts closes ear loops that mergeGeometries alone leaves open', () => {
    const parts = readSkinEnvelopePrimitiveParts();
    expect(parts.length).toBeGreaterThan(1);
    const unwelded = mergeGeometries(parts, false)!;
    expect(countEarDebugLoops(unwelded)).toBeGreaterThan(0);
    expect(countEarDebugLoops(mergeSkinEnvelopeParts(parts)!)).toBe(0);
  });

  it('welds GLTFLoader skin_envelope meshes (normals at primitive seams must not block weld)', async () => {
    const glbPath = path.join(REPO_ROOT, SKIN_GLB_PATH);
    const fileBytes = new Uint8Array(fs.readFileSync(glbPath));
    const arrayBuffer = fileBytes.buffer.slice(
      fileBytes.byteOffset,
      fileBytes.byteOffset + fileBytes.byteLength,
    );
    const gltf = await new Promise<{ scene: import('three').Group }>((resolve, reject) => {
      new GLTFLoader().parse(arrayBuffer, '', (loaded) => resolve(loaded), reject);
    });

    const loaderParts = collectSkinEnvelopePartsFromScene(gltf.scene);
    expect(loaderParts.length).toBeGreaterThan(1);
    expect(countEarDebugLoops(mergeSkinEnvelopeParts(loaderParts)!)).toBe(0);

    const extracted = extractGlbMeshes(gltf.scene, (name) => name === 'skin_envelope');
    expect(countEarDebugLoops(extracted[0]!.geometry)).toBe(0);
  });
});
