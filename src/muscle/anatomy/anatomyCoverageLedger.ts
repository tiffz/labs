import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_NODES, getNodesForRegion } from '../curriculum';
import { muscleModelsManifest as manifest } from '../types/muscleModelsManifest';
import type { MuscleRegion } from '../types/node';
import { isRegionalAtlasFragmentDuplicate } from '../components/canvas/fullBodyAtlasFilter';
import { auditGlbMeshResolution } from './glbFileAudit';
import { buildFullBodyRuntimeMeshInventory, collectSkinOverlayNodeIds } from './fullBodyRuntimeInventory';
import {
  REQUIRED_FULL_BODY_BONE_IDS,
  REQUIRED_FULL_BODY_MUSCLE_IDS,
  REQUIRED_SKIN_OVERLAY_NODE_IDS,
} from './requiredMeshIds';

export { REQUIRED_FULL_BODY_BONE_IDS, REQUIRED_SKIN_OVERLAY_NODE_IDS } from './requiredMeshIds';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CSV_PATH = path.join(REPO_ROOT, 'tools/muscle-anatomy/z_anatomy_name_map.csv');
const WAIVERS_PATH = path.join(REPO_ROOT, 'tools/muscle-anatomy/coverage-waivers.json');
const BASELINE_PATH = path.join(REPO_ROOT, 'tools/muscle-anatomy/coverage-baseline.json');

/** Manifest regions merged at runtime in FullBodyRegionModel. */
export const FULL_BODY_MANIFEST_REGIONS = [
  'atlas_complete',
  'atlas_head_face',
  'atlas_skin',
  'atlas_supplement',
  'torso',
  'shoulder_neck',
  'arm',
  'leg',
  'hand',
  'foot',
  'fundamentals',
] as const;

export const MODULE_STUDY_REGIONS: MuscleRegion[] = [
  'fundamentals',
  'torso',
  'shoulder_neck',
  'arm',
  'hand',
  'leg',
  'foot',
];

export type AnatomyGapKind =
  | 'module_region_mesh'
  | 'full_body_runtime'
  | 'csv_muscle'
  | 'skin_overlay'
  | 'glb_runtime'
  | 'runtime_inventory';

export type AnatomyGap = {
  kind: AnatomyGapKind;
  nodeId: string;
  region?: string;
  detail: string;
};

export type AnatomyCoverageReport = {
  generatedAt: string;
  summary: {
    moduleRegionGaps: number;
    fullBodyGaps: number;
    csvMuscleGaps: number;
    skinOverlayGaps: number;
    glbRuntimeGaps: number;
    runtimeInventoryGaps: number;
    waived: number;
    totalBlocking: number;
  };
  gaps: AnatomyGap[];
};

export type CoverageBaseline = {
  /** Full-body union gaps allowed while atlas export catches up (must not increase). */
  maxFullBodyGaps: number;
};

const CRITICAL_SUPPLEMENT_NODE_IDS = [
  'muscle_gluteus_maximus',
  'muscle_gluteus_medius',
  'muscle_gluteus_minimus',
] as const;

const SKIN_GLB_PATH = 'public/muscle/models/atlas_skin.glb';
const SUPPLEMENT_GLB_PATH = 'public/muscle/models/atlas_supplement.glb';

const CRITICAL_MUSCLE_MIN_TRIS: Record<string, number> = {
  muscle_gluteus_maximus: 2_000,
  muscle_gluteus_medius: 400,
  muscle_gluteus_minimus: 400,
};

const DEFAULT_MIN_MUSCLE_TRIS = 80;

export function collectManifestNodeIds(regions: readonly string[]): Set<string> {
  const ids = new Set<string>();
  for (const region of regions) {
    const entry = manifest.regions[region as keyof typeof manifest.regions];
    for (const mesh of entry?.meshes ?? []) {
      if (mesh.nodeId) ids.add(mesh.nodeId);
    }
  }
  return ids;
}

export function loadCoverageWaivers(): Map<string, string> {
  if (!fs.existsSync(WAIVERS_PATH)) return new Map();
  const raw = JSON.parse(fs.readFileSync(WAIVERS_PATH, 'utf8')) as {
    waivers?: Array<{ nodeId: string; reason: string }>;
  };
  return new Map((raw.waivers ?? []).map((row) => [row.nodeId, row.reason]));
}

export function loadCoverageBaseline(): CoverageBaseline {
  if (!fs.existsSync(BASELINE_PATH)) {
    return { maxFullBodyGaps: 0 };
  }
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as CoverageBaseline;
}

function loadCsvMuscleNodeIds(): Set<string> {
  const ids = new Set<string>();
  if (!fs.existsSync(CSV_PATH)) return ids;
  for (const line of fs.readFileSync(CSV_PATH, 'utf8').split('\n').slice(1)) {
    const [, nodeId] = line.split(',');
    const trimmed = nodeId?.trim();
    if (trimmed?.startsWith('muscle_')) ids.add(trimmed);
  }
  return ids;
}

function meshIndexByNodeId(): Map<string, { region: string; triangleCount: number }> {
  const byId = new Map<string, { region: string; triangleCount: number }>();
  for (const [region, entry] of Object.entries(manifest.regions ?? {})) {
    for (const mesh of entry.meshes ?? []) {
      if (!mesh.nodeId) continue;
      const triangleCount = mesh.triangleCount ?? 0;
      const existing = byId.get(mesh.nodeId);
      if (!existing || triangleCount > existing.triangleCount) {
        byId.set(mesh.nodeId, { region, triangleCount });
      }
    }
  }
  return byId;
}

export function buildAnatomyCoverageReport(): AnatomyCoverageReport {
  const waivers = loadCoverageWaivers();
  const gaps: AnatomyGap[] = [];
  const waivedIds = new Set<string>();

  for (const region of MODULE_STUDY_REGIONS) {
    const manifestIds = new Set((manifest.regions[region]?.meshes ?? []).map((mesh) => mesh.nodeId));
    for (const node of getNodesForRegion(region, { includeAtlas: false })) {
      if (node.atlasOnly) continue;
      if (manifestIds.has(node.id)) continue;
      if (waivers.has(node.id)) {
        waivedIds.add(node.id);
        continue;
      }
      gaps.push({
        kind: 'module_region_mesh',
        nodeId: node.id,
        region,
        detail: `${region} curriculum node missing from ${region}.glb manifest`,
      });
    }
  }

  const fullBodyIds = collectManifestNodeIds(FULL_BODY_MANIFEST_REGIONS);
  for (const node of ALL_NODES) {
    if (fullBodyIds.has(node.id)) continue;
    if (waivers.has(node.id)) {
      waivedIds.add(node.id);
      continue;
    }
    gaps.push({
      kind: 'full_body_runtime',
      nodeId: node.id,
      region: node.region,
      detail: 'Node missing from full-body manifest union (atlas + module GLBs)',
    });
  }

  const meshIndex = meshIndexByNodeId();
  for (const nodeId of loadCsvMuscleNodeIds()) {
    const entry = meshIndex.get(nodeId);
    if (!entry) {
      if (waivers.has(nodeId)) {
        waivedIds.add(nodeId);
        continue;
      }
      gaps.push({
        kind: 'csv_muscle',
        nodeId,
        detail: 'Z-Anatomy CSV muscle has no manifest mesh in any region',
      });
      continue;
    }
    const minTris = CRITICAL_MUSCLE_MIN_TRIS[nodeId] ?? DEFAULT_MIN_MUSCLE_TRIS;
    if (entry.triangleCount < minTris) {
      if (waivers.has(nodeId)) {
        waivedIds.add(nodeId);
        continue;
      }
      gaps.push({
        kind: 'csv_muscle',
        nodeId,
        region: entry.region,
        detail: `${entry.triangleCount} tris in ${entry.region} below minimum ${minTris}`,
      });
    }
  }

  const skinManifestIds = new Set((manifest.regions.atlas_skin?.meshes ?? []).map((mesh) => mesh.nodeId));
  for (const nodeId of REQUIRED_SKIN_OVERLAY_NODE_IDS) {
    if (skinManifestIds.has(nodeId)) continue;
    if (waivers.has(nodeId)) {
      waivedIds.add(nodeId);
      continue;
    }
    gaps.push({
      kind: 'skin_overlay',
      nodeId,
      detail: 'Required skin overlay missing from atlas_skin manifest',
    });
  }

  const skinGlb = auditGlbMeshResolution(SKIN_GLB_PATH, REQUIRED_SKIN_OVERLAY_NODE_IDS);
  for (const nodeId of skinGlb.missingNodeIds) {
    if (waivers.has(nodeId)) {
      waivedIds.add(nodeId);
      continue;
    }
    gaps.push({
      kind: 'glb_runtime',
      nodeId,
      detail: `No mesh in ${SKIN_GLB_PATH} resolves to this skin overlay id`,
    });
  }
  for (const meshName of skinGlb.unmappedMeshNames) {
    gaps.push({
      kind: 'glb_runtime',
      nodeId: meshName,
      detail: `${SKIN_GLB_PATH} mesh name does not resolve via resolveCurriculumNodeId()`,
    });
  }

  const supplementGlb = auditGlbMeshResolution(SUPPLEMENT_GLB_PATH, CRITICAL_SUPPLEMENT_NODE_IDS);
  for (const nodeId of supplementGlb.missingNodeIds) {
    if (waivers.has(nodeId)) {
      waivedIds.add(nodeId);
      continue;
    }
    gaps.push({
      kind: 'glb_runtime',
      nodeId,
      detail: `No mesh in ${SUPPLEMENT_GLB_PATH} resolves to this supplement id`,
    });
  }

  const runtimeInventory = buildFullBodyRuntimeMeshInventory();
  const skinInventory = collectSkinOverlayNodeIds();

  for (const nodeId of REQUIRED_FULL_BODY_BONE_IDS) {
    if (runtimeInventory.has(nodeId)) continue;
    if (waivers.has(nodeId)) {
      waivedIds.add(nodeId);
      continue;
    }
    gaps.push({
      kind: 'runtime_inventory',
      nodeId,
      detail: 'Required full-body bone missing from simulated mesh inventory (check fundamentals + merge)',
    });
  }

  for (const nodeId of REQUIRED_FULL_BODY_MUSCLE_IDS) {
    if (runtimeInventory.has(nodeId)) continue;
    if (waivers.has(nodeId)) {
      waivedIds.add(nodeId);
      continue;
    }
    gaps.push({
      kind: 'runtime_inventory',
      nodeId,
      detail: 'Required full-body muscle missing from simulated mesh inventory (check atlas + merge)',
    });
  }

  for (const nodeId of REQUIRED_SKIN_OVERLAY_NODE_IDS) {
    if (skinInventory.has(nodeId)) continue;
    if (waivers.has(nodeId)) {
      waivedIds.add(nodeId);
      continue;
    }
    gaps.push({
      kind: 'runtime_inventory',
      nodeId,
      detail: 'Required skin overlay missing from simulated skin inventory (atlas_skin.glb)',
    });
  }

  const anatomyManifestRegions = FULL_BODY_MANIFEST_REGIONS.filter(
    (region) => region !== 'atlas_skin',
  );
  const manifestUnion = collectManifestNodeIds(anatomyManifestRegions);
  for (const nodeId of manifestUnion) {
    if (isRegionalAtlasFragmentDuplicate(nodeId)) continue;
    if (runtimeInventory.has(nodeId)) continue;
    if (waivers.has(nodeId)) {
      waivedIds.add(nodeId);
      continue;
    }
    const node = ALL_NODES.find((entry) => entry.id === nodeId);
    gaps.push({
      kind: 'runtime_inventory',
      nodeId,
      region: node?.region,
      detail: 'Manifest lists mesh but Full body anatomy merge inventory cannot extract it',
    });
  }

  const byKind = (kind: AnatomyGapKind) => gaps.filter((gap) => gap.kind === kind);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      moduleRegionGaps: byKind('module_region_mesh').length,
      fullBodyGaps: byKind('full_body_runtime').length,
      csvMuscleGaps: byKind('csv_muscle').length,
      skinOverlayGaps: byKind('skin_overlay').length,
      glbRuntimeGaps: byKind('glb_runtime').length,
      runtimeInventoryGaps: byKind('runtime_inventory').length,
      waived: waivedIds.size,
      totalBlocking:
        byKind('module_region_mesh').length +
        byKind('csv_muscle').length +
        byKind('skin_overlay').length +
        byKind('glb_runtime').length +
        byKind('runtime_inventory').length,
    },
    gaps,
  };
}

export function formatAnatomyCoverageReport(report: AnatomyCoverageReport): string {
  const lines = [
    '# Muscle anatomy coverage',
    '',
    `- Module region gaps: ${report.summary.moduleRegionGaps}`,
    `- Full-body union gaps: ${report.summary.fullBodyGaps} (baseline cap in coverage-baseline.json)`,
    `- CSV muscle gaps: ${report.summary.csvMuscleGaps}`,
    `- Skin overlay gaps: ${report.summary.skinOverlayGaps}`,
    `- GLB runtime gaps: ${report.summary.glbRuntimeGaps}`,
    `- Runtime inventory gaps: ${report.summary.runtimeInventoryGaps}`,
    `- Simulated Full body anatomy meshes: ${buildFullBodyRuntimeMeshInventory().size} node ids`,
    `- Simulated skin overlays: ${collectSkinOverlayNodeIds().size} node ids`,
    `- Waived: ${report.summary.waived}`,
    '',
  ];
  for (const kind of [
    'module_region_mesh',
    'full_body_runtime',
    'csv_muscle',
    'skin_overlay',
    'glb_runtime',
    'runtime_inventory',
  ] as const) {
    const rows = report.gaps.filter((gap) => gap.kind === kind);
    if (rows.length === 0) continue;
    lines.push(`## ${kind} (${rows.length})`);
    for (const row of rows.slice(0, 40)) {
      lines.push(`- ${row.nodeId}${row.region ? ` (${row.region})` : ''}: ${row.detail}`);
    }
    if (rows.length > 40) lines.push(`- … and ${rows.length - 40} more`);
    lines.push('');
  }
  return lines.join('\n');
}
