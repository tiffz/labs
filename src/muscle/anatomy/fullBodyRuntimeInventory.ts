import { getNodeById } from '../curriculum';
import { resolveCurriculumNodeId } from '../curriculum/zAnatomyBridge';
import { shouldIncludeAtlasCompleteMesh, shouldIncludeHeadFaceAtlasMesh } from '../components/canvas/fullBodyAtlasFilter';
import { muscleModelsManifest as manifest } from '../types/muscleModelsManifest';
import { listGlbMeshNames } from './glbFileAudit';

/** Same regions/order as FullBodyRegionModel mesh merge (later group wins). */
const FULL_BODY_MERGE_GROUPS: ReadonlyArray<{
  region: string;
  includeResolvedId: (nodeId: string) => boolean;
}> = [
  {
    region: 'atlas_complete',
    includeResolvedId: (nodeId) => shouldIncludeAtlasCompleteMesh(nodeId),
  },
  {
    region: 'atlas_head_face',
    includeResolvedId: (nodeId) => shouldIncludeHeadFaceAtlasMesh(nodeId) && Boolean(getNodeById(nodeId)),
  },
  {
    region: 'fundamentals',
    includeResolvedId: (nodeId) => Boolean(getNodeById(nodeId)),
  },
  {
    region: 'torso',
    includeResolvedId: (nodeId) => Boolean(getNodeById(nodeId)),
  },
  {
    region: 'shoulder_neck',
    includeResolvedId: (nodeId) => Boolean(getNodeById(nodeId)),
  },
  {
    region: 'arm',
    includeResolvedId: (nodeId) => Boolean(getNodeById(nodeId)),
  },
  {
    region: 'leg',
    includeResolvedId: (nodeId) => Boolean(getNodeById(nodeId)),
  },
  {
    region: 'atlas_supplement',
    includeResolvedId: (nodeId) => Boolean(getNodeById(nodeId)),
  },
  {
    region: 'hand',
    includeResolvedId: (nodeId) => Boolean(getNodeById(nodeId)),
  },
  {
    region: 'foot',
    includeResolvedId: (nodeId) => Boolean(getNodeById(nodeId)),
  },
];

function glbRelativePath(region: string): string | undefined {
  const entry = manifest.regions[region as keyof typeof manifest.regions];
  const url = entry?.glbUrl ?? `/muscle/models/${region}.glb`;
  return url.startsWith('/') ? `public${url}` : undefined;
}

/** Node ids extracted from one GLB using the same filters as FullBodyRegionModel. */
export function collectResolvedNodeIdsFromGlb(
  region: string,
  includeResolvedId: (nodeId: string) => boolean,
): Set<string> {
  const rel = glbRelativePath(region);
  const ids = new Set<string>();
  if (!rel) return ids;

  for (const meshName of listGlbMeshNames(rel)) {
    const nodeId = resolveCurriculumNodeId(meshName);
    if (!nodeId || !includeResolvedId(nodeId)) continue;
    ids.add(nodeId);
  }
  return ids;
}

/**
 * Simulates FullBodyRegionModel mesh merge — the set of labeled node ids with GLB geometry
 * available after resolveCurriculumNodeId + regional filters (no Three.js plausibility pass).
 */
export function buildFullBodyRuntimeMeshInventory(): Set<string> {
  const byId = new Map<string, number>();

  FULL_BODY_MERGE_GROUPS.forEach(({ region, includeResolvedId }, groupIndex) => {
    for (const nodeId of collectResolvedNodeIdsFromGlb(region, includeResolvedId)) {
      byId.set(nodeId, groupIndex);
    }
  });

  return new Set(byId.keys());
}

export function formatRuntimeInventorySummary(inventory: Set<string>): string {
  const bones = [...inventory].filter((id) => id.startsWith('bone_')).sort();
  const muscles = [...inventory].filter((id) => id.startsWith('muscle_')).sort();
  const atlas = [...inventory].filter((id) => id.startsWith('atlas_')).sort();
  return [
    `Runtime mesh inventory: ${inventory.size} node ids`,
    `- bones (${bones.length}): ${bones.slice(0, 12).join(', ')}${bones.length > 12 ? '…' : ''}`,
    `- muscles (${muscles.length})`,
    `- atlas fill (${atlas.length})`,
  ].join('\n');
}
