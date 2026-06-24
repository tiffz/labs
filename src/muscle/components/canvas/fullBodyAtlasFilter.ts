import { ATLAS_MESH_NODE_IDS } from '../../curriculum/atlasMeshRegistry';

/** Atlas-complete GLB also embeds decimated curriculum duplicates — those load from regional GLBs instead. */
const ATLAS_GLUTE_FRAGMENT = /^atlas_gluteus_/;

/**
 * Full-body atlas GLB is for atlas-registry fill nodes only (context muscles/bones
 * not duplicated in module exports). Curriculum ids in torso/leg/atlas_supplement GLBs
 * must not load again from atlas_complete or merge/dedupe fights create visible holes.
 */
export function shouldIncludeAtlasCompleteMesh(meshName: string): boolean {
  if (!ATLAS_MESH_NODE_IDS.has(meshName)) return false;
  if (ATLAS_GLUTE_FRAGMENT.test(meshName)) return false;
  return true;
}
