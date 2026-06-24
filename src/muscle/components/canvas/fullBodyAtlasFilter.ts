import { getNodesForRegion } from '../../curriculum';
import { ATLAS_MESH_NODE_IDS } from '../../curriculum/atlasMeshRegistry';
import type { MuscleRegion } from '../../types/node';

/** Atlas-complete GLB also embeds decimated curriculum duplicates — those load from regional GLBs instead. */
const ATLAS_GLUTE_FRAGMENT = /^atlas_gluteus_/;

/** Atlas uses alternate names for muscles already merged in regional GLBs. */
const ATLAS_REGIONAL_FAMILY_PREFIXES = [
  'atlas_deltoid_',
  'atlas_latissimus_dorsi_',
  'atlas_pectoralis_',
  'atlas_serratus_anterior_',
] as const;

const ATLAS_REGIONAL_NAME_PATTERNS = [
  /^atlas_.*trapezius/,
  ATLAS_GLUTE_FRAGMENT,
] as const;

const REGIONAL_GLBF_REGIONS: MuscleRegion[] = [
  'fundamentals',
  'torso',
  'shoulder_neck',
  'arm',
  'hand',
  'leg',
  'foot',
];

function buildRegionalAtlasExclusionPrefixes(): readonly string[] {
  const prefixes = new Set<string>(ATLAS_REGIONAL_FAMILY_PREFIXES);
  for (const region of REGIONAL_GLBF_REGIONS) {
    for (const node of getNodesForRegion(region)) {
      if (node.atlasOnly) continue;
      const match = node.id.match(/^(?:muscle|bone|joint)_(.+)$/);
      if (match) prefixes.add(`atlas_${match[1]}_`);
    }
  }
  return [...prefixes];
}

const REGIONAL_ATLAS_EXCLUSION_PREFIXES = buildRegionalAtlasExclusionPrefixes();

/** Decimated atlas sub-meshes that overlap a regional GLB mesh and cause z-fighting. */
export function isRegionalAtlasFragmentDuplicate(meshName: string): boolean {
  if (!meshName.startsWith('atlas_')) return false;
  if (ATLAS_REGIONAL_NAME_PATTERNS.some((pattern) => pattern.test(meshName))) return true;
  return REGIONAL_ATLAS_EXCLUSION_PREFIXES.some((prefix) => meshName.startsWith(prefix));
}

/**
 * Full-body atlas GLB is for atlas-registry fill nodes only (context muscles/bones
 * not duplicated in module exports). Curriculum ids in torso/leg/atlas_supplement GLBs
 * must not load again from atlas_complete or merge/dedupe fights create visible holes.
 */
export function shouldIncludeAtlasCompleteMesh(meshName: string): boolean {
  if (!ATLAS_MESH_NODE_IDS.has(meshName)) return false;
  if (isRegionalAtlasFragmentDuplicate(meshName)) return false;
  return true;
}
