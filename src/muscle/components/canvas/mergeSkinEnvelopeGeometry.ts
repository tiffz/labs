import type { BufferGeometry } from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { sealEarLateralBoundaryCracks } from '../../anatomy/sealEarLateralCracks';
import { assignBufferGeometryIndex } from './skinGeometryIndex';

/** Weld verts shared across glTF primitives — must match skinGlbEnvelopeReader / audit path. */
export const SKIN_GLB_PRIMITIVE_WELD_EPSILON = 0.0012;

function normalizeWeldedSkinIndex(geometry: BufferGeometry): void {
  const index = geometry.getIndex();
  if (!index) return;
  const indices: number[] = [];
  for (let i = 0; i < index.count; i += 1) {
    indices.push(index.getX(i)!);
  }
  assignBufferGeometryIndex(geometry, indices);
  geometry.clearGroups();
}

function finalizeWeldedSkinEnvelope(geometry: BufferGeometry): BufferGeometry {
  const sealed = sealEarLateralBoundaryCracks(geometry);
  normalizeWeldedSkinIndex(sealed);
  sealed.computeVertexNormals();
  return sealed;
}

/** mergeVertices keys on every attribute; GLTFLoader adds normals that differ at primitive seams. */
function stripToPositionAndIndex(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.getAttribute('position');
  if (!position) return geometry.clone();

  const stripped = geometry.clone();
  for (const name of Object.keys(stripped.attributes)) {
    if (name !== 'position') stripped.deleteAttribute(name);
  }
  stripped.clearGroups();
  return stripped;
}

/** Merge skin_envelope glTF primitives and weld primitive-boundary seams. */
export function mergeSkinEnvelopeParts(parts: BufferGeometry[]): BufferGeometry | null {
  const strippedParts = parts.map(stripToPositionAndIndex);
  if (strippedParts.length === 0) return null;
  if (strippedParts.length === 1) {
    const welded = mergeVertices(strippedParts[0]!.clone(), SKIN_GLB_PRIMITIVE_WELD_EPSILON);
    return finalizeWeldedSkinEnvelope(welded);
  }

  const merged = mergeGeometries(strippedParts, false);
  if (!merged) return null;
  const welded = mergeVertices(merged, SKIN_GLB_PRIMITIVE_WELD_EPSILON);
  return finalizeWeldedSkinEnvelope(welded);
}
