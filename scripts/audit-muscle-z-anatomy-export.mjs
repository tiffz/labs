#!/usr/bin/env node
/**
 * Compare Z-Anatomy export coverage: manifest GLBs vs curriculum nodes vs name-map CSV.
 * Optional --with-blender runs Blender-side candidate scan (requires Z-Anatomy.blend).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'public/muscle/models/manifest.json');
const nodesDir = path.join(root, 'src/muscle/curriculum/nodes');
const csvPath = path.join(root, 'tools/muscle-anatomy/z_anatomy_name_map.csv');
const blend = path.join(root, 'tools/muscle-anatomy/data/Z-Anatomy.blend');
const exportScript = path.join(root, 'tools/muscle-anatomy/export_region_glb.py');
const reportPath = path.join(root, 'tools/muscle-anatomy/data/export-audit-report.json');

const ATLAS_REGIONS = ['atlas_complete', 'atlas_head_face', 'atlas_supplement', 'atlas_skin'];
const SKIN_IDS = new Set([
  'skin_envelope',
  'eye_globes',
  'skin_face',
  'skin_limbs',
  'skin_torso',
  'skin_hand_digits',
  'skin_foot_digits',
  'skin_eminences',
]);

const BODY_AREAS = {
  face: /\b(face|facial|buccinator|masseter|temporalis|orbicular|procerus|corrugator|zygomatic|mental|platysma|risorius|nasalis|levator labii|depressor)\b/i,
  butt: /\b(glute|piriformis|obturator internus|gemell|quadratus femoris|tensor fasciae|ischial tuberosity)\b/i,
  leg: /\b(femur|tibia|fibula|quadriceps|hamstring|gastrocnemius|soleus|sartorius|iliopsoas|adductor|vastus|patella|peroneus|gracilis|semimembranosus|semitendinosus)\b/i,
  hand: /\b(hand|metacarp|carpal|thenar|hypothenar|flexor dig|extensor dig|lumbrical|interossei)\b/i,
  foot: /\b(foot|tarsal|metatars|phalang|plantar|calcaneus|talus|achilles)\b/i,
};

function normalizeZName(name) {
  return name
    .replace(/\*\.r$/i, '')
    .replace(/\.(r|l)(\.\d+)?$/i, '')
    .trim()
    .toLowerCase();
}

function collectCurriculumIds() {
  const ids = new Set();
  for (const file of fs.readdirSync(nodesDir)) {
    if (!file.endsWith('.ts')) continue;
    const text = fs.readFileSync(path.join(nodesDir, file), 'utf8');
    for (const match of text.matchAll(/\b(?:bone|muscle|joint)\(\s*'([a-z0-9_]+)'/g)) {
      ids.add(match[1]);
    }
  }
  return ids;
}

function loadCsvRows() {
  const text = fs.readFileSync(csvPath, 'utf8').trim();
  const lines = text.split('\n');
  const rows = [];
  for (const line of lines.slice(1)) {
    const [zName, nodeId, region] = line.split(',');
    if (!zName || !nodeId) continue;
    rows.push({ zName: zName.trim(), nodeId: nodeId.trim(), region: (region ?? '').trim() });
  }
  return rows;
}

function loadManifestIndex(manifest) {
  const nodeIds = new Set();
  const displayNames = [];
  const zNamesFromAtlas = new Set();

  for (const region of ATLAS_REGIONS) {
    for (const mesh of manifest.regions?.[region]?.meshes ?? []) {
      nodeIds.add(mesh.nodeId);
      if (mesh.displayName) {
        displayNames.push({ region, displayName: mesh.displayName, nodeId: mesh.nodeId });
        zNamesFromAtlas.add(normalizeZName(mesh.displayName));
      }
    }
  }
  return { nodeIds, displayNames, zNamesFromAtlas };
}

function classifyArea(label) {
  for (const [area, pattern] of Object.entries(BODY_AREAS)) {
    if (pattern.test(label)) return area;
  }
  return 'other';
}

function auditManifestVsCurriculum(manifest) {
  const curriculumIds = collectCurriculumIds();
  const { nodeIds, displayNames, zNamesFromAtlas } = loadManifestIndex(manifest);
  const csvRows = loadCsvRows();

  const missingCurriculum = [...curriculumIds]
    .filter((id) => !SKIN_IDS.has(id) && !nodeIds.has(id))
    .sort();

  const missingCsvByNode = [];
  const missingCsvByZName = [];
  for (const row of csvRows) {
    if (!nodeIds.has(row.nodeId)) {
      missingCsvByNode.push(row);
    }
    const normalized = normalizeZName(row.zName);
    if (!zNamesFromAtlas.has(normalized) && !nodeIds.has(row.nodeId)) {
      missingCsvByZName.push(row);
    }
  }

  const byArea = {};
  for (const entry of [...missingCurriculum.map((id) => ({ kind: 'curriculum', id })), ...missingCsvByNode.map((r) => ({ kind: 'csv', id: r.nodeId, zName: r.zName }))]) {
    const label = entry.zName ?? entry.id;
    const area = classifyArea(label);
    byArea[area] ??= [];
    byArea[area].push(entry);
  }

  const atlasComplete = manifest.regions?.atlas_complete;
  const gluteMeshes = (atlasComplete?.meshes ?? []).filter((m) =>
    /\bglute|piriformis|gemell|obturator internus|quadratus femoris|tensor fasciae/i.test(
      `${m.nodeId} ${m.displayName ?? ''}`,
    ),
  );

  return {
    summary: {
      curriculumTotal: curriculumIds.size,
      manifestNodeIds: nodeIds.size,
      csvRows: csvRows.length,
      missingCurriculumCount: missingCurriculum.length,
      missingCsvNodeCount: missingCsvByNode.length,
      atlasCompleteMeshes: atlasComplete?.meshes?.length ?? 0,
      gluteMeshCount: gluteMeshes.length,
      skinMeshCount: (manifest.regions?.atlas_skin?.meshes ?? []).length,
    },
    missingCurriculum,
    missingCsvByNode,
    missingCsvByZName,
    gluteMeshes: gluteMeshes.map((m) => ({ nodeId: m.nodeId, displayName: m.displayName, tris: m.triangleCount })),
    skinMeshes: (manifest.regions?.atlas_skin?.meshes ?? []).map((m) => m.nodeId),
    missingByBodyArea: byArea,
    sampleDisplayNames: displayNames.slice(0, 5),
  };
}

function runBlenderAudit() {
  const blenderCandidates = [
    process.env.BLENDER,
    '/Applications/Blender.app/Contents/MacOS/Blender',
    'blender',
  ].filter(Boolean);
  const blender =
    blenderCandidates.find((c) => c !== 'blender' && fs.existsSync(c)) ?? 'blender';

  const result = spawnSync(
    blender,
    [blend, '--background', '--python', exportScript, '--', '--audit', '--blend', blend],
    { cwd: root, encoding: 'utf8' },
  );
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch {
    return null;
  }
}

function printReport(report, blenderReport) {
  console.log('\n=== Muscle / bone export audit ===\n');
  console.log('Summary:', JSON.stringify(report.summary, null, 2));

  if (report.gluteMeshes.length > 0) {
    console.log(`\nGlute / hip rotator meshes in atlas_complete (${report.gluteMeshes.length}):`);
    for (const m of report.gluteMeshes) {
      console.log(`  • ${m.displayName ?? m.nodeId} (${m.tris ?? '?'} tris)`);
    }
  } else {
    console.log('\n⚠ No glute meshes found in atlas_complete manifest — re-export may be needed.');
  }

  console.log(`\nSkin overlay meshes (${report.skinMeshes.length}): ${report.skinMeshes.join(', ') || '(none)'}`);

  if (report.missingCurriculum.length > 0) {
    console.log(`\nCurriculum nodes not in any atlas manifest region (${report.missingCurriculum.length}):`);
    for (const id of report.missingCurriculum.slice(0, 40)) {
      console.log(`  • ${id}`);
    }
    if (report.missingCurriculum.length > 40) {
      console.log(`  … and ${report.missingCurriculum.length - 40} more`);
    }
  } else {
    console.log('\n✓ All curriculum node ids appear in atlas manifest regions.');
  }

  for (const [area, items] of Object.entries(report.missingByBodyArea).sort()) {
    if (area === 'other' || items.length === 0) continue;
    console.log(`\n${area} — gaps (${items.length}):`);
    for (const item of items.slice(0, 15)) {
      console.log(`  • ${item.zName ?? item.id}`);
    }
  }

  if (blenderReport?.blenderCandidates) {
    console.log(`\nBlender Z-Anatomy candidates: ${blenderReport.blenderCandidates.total}`);
    console.log(`Not represented in manifest: ${blenderReport.blenderCandidates.unexported.length}`);
    if (blenderReport.blenderCandidates.unexported.length > 0) {
      for (const name of blenderReport.blenderCandidates.unexported.slice(0, 25)) {
        console.log(`  • ${name}`);
      }
    }
  }

  console.log(`\nFull report: ${reportPath}`);
}

function main() {
  const withBlender = process.argv.includes('--with-blender');

  if (!fs.existsSync(manifestPath)) {
    console.error('Missing manifest:', manifestPath);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const report = auditManifestVsCurriculum(manifest);

  let blenderReport = null;
  if (withBlender) {
    if (!fs.existsSync(blend)) {
      console.warn('Skipping Blender audit — missing', blend);
    } else {
      blenderReport = runBlenderAudit();
      if (blenderReport) {
        report.blenderCandidates = blenderReport.blenderCandidates;
      }
    }
  }

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 2)}\n`);

  printReport(report, blenderReport);

  const failOnGaps = process.argv.includes('--strict');
  const hasCriticalGaps =
    report.missingCsvByNode.length > 0 ||
    (report.skinMeshes.length === 0) ||
    (report.gluteMeshes.length === 0);

  if (failOnGaps && hasCriticalGaps) {
    process.exit(1);
  }
}

main();
