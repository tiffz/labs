import type { BufferGeometry, Mesh, Object3D } from 'three';
import { alignSkinEnvelopeToStudyHalf } from './alignSkinEnvelopeGeometry';
import {
  clipSkinGeometryForReferenceHalf,
  clipSkinGeometryForStudyHalf,
} from './skinHalfClipOptions';
import { mergeSkinEnvelopeParts } from './mergeSkinEnvelopeGeometry';

const SKIN_ENVELOPE_MESH_PATTERN = /^skin_envelope(_\d+)?$/;

/** Collect glTF primitive parts — matches Node GLB reader (no matrix bake / plausible filter). */
export function collectSkinEnvelopePartsFromScene(scene: Object3D): BufferGeometry[] {
  const parts: BufferGeometry[] = [];
  scene.traverse((child) => {
    if (!(child as Mesh).isMesh) return;
    const mesh = child as Mesh;
    if (!SKIN_ENVELOPE_MESH_PATTERN.test(mesh.name)) return;
    parts.push(mesh.geometry.clone());
  });
  return parts;
}

/**
 * Browser-safe skin envelope prep from a loaded GLTF scene.
 * Primitive merge + ear seal matches Node audit reader (`skinGlbEnvelopeReader`).
 */
export function buildAlignedWeldedSkinEnvelopeFromScene(scene: Object3D): BufferGeometry | null {
  const parts = collectSkinEnvelopePartsFromScene(scene);
  if (parts.length === 0) return null;
  const welded = mergeSkinEnvelopeParts(parts);
  if (!welded) return null;
  return alignSkinEnvelopeToStudyHalf(welded);
}

export function buildClippedSkinEnvelopeForHalfFromScene(
  scene: Object3D,
  half: 'reference' | 'study',
): BufferGeometry | null {
  const aligned = buildAlignedWeldedSkinEnvelopeFromScene(scene);
  if (!aligned) return null;
  return half === 'study'
    ? clipSkinGeometryForStudyHalf(aligned)
    : clipSkinGeometryForReferenceHalf(aligned);
}
