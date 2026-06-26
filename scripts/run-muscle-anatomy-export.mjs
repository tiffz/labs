#!/usr/bin/env node
/**
 * Muscle Z-Anatomy export pipeline — audit → export → validate → sync → visual checklist.
 * Skill: labs-muscle-anatomy-export
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const blend = path.join(root, 'tools/muscle-anatomy/data/Z-Anatomy.blend');
const exportScript = path.join(root, 'tools/muscle-anatomy/export_region_glb.py');

const ALL_REGIONS = [
  'fundamentals',
  'torso',
  'shoulder_neck',
  'arm',
  'hand',
  'leg',
  'foot',
  'atlas_supplement',
  'atlas_head_face',
  'atlas_skin',
  'atlas_complete',
];

const ATLAS_REGIONS = new Set(['atlas_supplement', 'atlas_head_face', 'atlas_skin', 'atlas_complete']);

const blenderCandidates = [
  process.env.BLENDER,
  '/Applications/Blender.app/Contents/MacOS/Blender',
  'blender',
].filter(Boolean);

function parseArgs(argv) {
  const regionIdx = argv.indexOf('--region');
  return {
    region: regionIdx >= 0 ? argv[regionIdx + 1] : null,
    skipExport: argv.includes('--skip-export'),
    skipAudit: argv.includes('--skip-audit'),
    strictAudit: argv.includes('--strict-audit'),
    skipBridge: argv.includes('--skip-bridge'),
    skipAtlasRegistry: argv.includes('--skip-atlas-registry'),
    withBlenderAudit: argv.includes('--with-blender'),
  };
}

function run(label, command, args, { shell = false } = {}) {
  console.log(`\n=== ${label} ===\n`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function resolveBlender() {
  return blenderCandidates.find((candidate) => candidate !== 'blender' && fs.existsSync(candidate)) ?? 'blender';
}

function exportArgsForRegion(region) {
  if (region === 'atlas_complete') {
    return ['--ratio', '0.15', '--max-tris', '10000', '--max-region-tris', '400000'];
  }
  if (region === 'atlas_skin') {
    return ['--ratio', '0.85', '--max-tris', '44000', '--max-region-tris', '90000'];
  }
  if (region === 'atlas_supplement') {
    return ['--ratio', '0.55', '--max-tris', '25000', '--max-region-tris', '120000'];
  }
  return ['--ratio', '0.2', '--max-tris', '25000', '--max-region-tris', '80000'];
}

function exportRegion(blender, region) {
  run(
    `Export ${region}`,
    blender,
    [
      blend,
      '--background',
      '--python',
      exportScript,
      '--',
      '--region',
      region,
      '--blend',
      blend,
      ...exportArgsForRegion(region),
    ],
  );
}

function printVisualChecklist(regions) {
  const touchedAtlas = regions.some((r) => ATLAS_REGIONS.has(r));
  console.log('\n=== Visual checklist (hard refresh /muscle/) ===\n');
  console.log('1. Cmd+Shift+R on /muscle/ — HMR can hide stale GLB cache.');
  if (touchedAtlas) {
    console.log('2. Full body module: sagittal split — muscles on +X, skin mirrored on −X.');
    console.log('3. Skin: no stitch ridges; check palm, elbow, knee, neck/shoulder, face, ankles.');
    console.log('4. Eye globes: orbital sockets filled (not hollow).');
    console.log('5. Layer peel 0: semi-transparent study skin (depth 1+ hides skin).');
  }
  console.log('6. Orbit ~10 s — no sustained judder.');
  console.log('\nFull protocol: docs/MUSCLE_QA.md');
  console.log('Skill: .cursor/skills/labs-muscle-anatomy-export/SKILL.md\n');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const regions = opts.region ? [opts.region] : ALL_REGIONS;

  if (!opts.skipExport && !fs.existsSync(blend)) {
    console.error('Missing Z-Anatomy blend file:', blend);
    console.error('Download to tools/muscle-anatomy/data/ first.');
    process.exit(1);
  }

  if (!opts.skipAudit) {
    const auditArgs = ['run', 'muscle:audit-export'];
    if (opts.withBlenderAudit || opts.strictAudit) {
      auditArgs.push('--');
      if (opts.withBlenderAudit) auditArgs.push('--with-blender');
      if (opts.strictAudit) auditArgs.push('--strict');
    }
    run('Pre-export audit', 'npm', auditArgs, { shell: true });
  }

  if (!opts.skipExport) {
    const blender = resolveBlender();
    console.log(`Using Blender: ${blender}`);
    for (const region of regions) {
      exportRegion(blender, region);
    }
  }

  run('Validate assets', 'npm', ['run', 'muscle:validate-assets'], { shell: true });

  if (regions.includes('atlas_skin')) {
    run('Skin boundary audit', 'npm', ['run', 'muscle:skin-boundary'], { shell: true });
    run('Skin half-split audit', 'npm', ['run', 'muscle:skin-half-split'], { shell: true });
    run('Skin coverage audit', 'npm', ['run', 'muscle:skin-coverage'], { shell: true });
    run('Skin seam-gap audit', 'npm', ['run', 'muscle:skin-seam-gaps'], { shell: true });
  }

  if (!opts.skipBridge) {
    run('Sync zAnatomyBridge', 'npm', ['run', 'muscle:sync-bridge'], { shell: true });
  }

  if (!opts.skipAtlasRegistry && regions.some((r) => ATLAS_REGIONS.has(r))) {
    run('Sync atlas mesh registry', 'npm', ['run', 'muscle:sync-atlas-registry'], { shell: true });
  }

  if (!opts.skipAudit) {
    const postAuditArgs = ['run', 'muscle:audit-export'];
    run('Post-export audit', 'npm', postAuditArgs, { shell: true });
  }

  printVisualChecklist(regions);
}

main();
