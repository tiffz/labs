#!/usr/bin/env node
/**
 * Export all Muscle Memory region GLBs from Z-Anatomy via Blender.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const blend = path.join(root, 'tools/muscle-anatomy/data/Z-Anatomy.blend');
const exportScript = path.join(root, 'tools/muscle-anatomy/export_region_glb.py');

const blenderCandidates = [
  process.env.BLENDER,
  '/Applications/Blender.app/Contents/MacOS/Blender',
  'blender',
].filter(Boolean);

const blender = blenderCandidates.find((candidate) => candidate !== 'blender' && fs.existsSync(candidate)) ?? 'blender';

const regions = ['fundamentals', 'torso', 'shoulder_neck', 'arm', 'hand', 'leg', 'foot', 'atlas_supplement', 'atlas_head_face', 'atlas_skin', 'atlas_complete'];

if (!fs.existsSync(blend)) {
  console.error('Missing Z-Anatomy blend file:', blend);
  console.error('Download and extract to tools/muscle-anatomy/data/ first.');
  process.exit(1);
}

console.log(`Using Blender: ${blender}`);

  for (const region of regions) {
  const exportArgs =
    region === 'atlas_complete'
      ? ['--ratio', '0.15', '--max-tris', '10000', '--max-region-tris', '400000']
      : ['--ratio', '0.2', '--max-tris', '25000', '--max-region-tris', '80000'];
  console.log(`\n=== Exporting ${region} ===`);
  const result = spawnSync(
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
      ...exportArgs,
    ],
    { stdio: 'inherit', cwd: root },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('\nRunning muscle:validate-assets…');
const validate = spawnSync('npm', ['run', 'muscle:validate-assets'], { stdio: 'inherit', cwd: root, shell: true });
if (validate.status !== 0) process.exit(validate.status ?? 1);

console.log('\nSyncing zAnatomyBridge.ts from CSV…');
const bridge = spawnSync('npm', ['run', 'muscle:sync-bridge'], { stdio: 'inherit', cwd: root, shell: true });
process.exit(bridge.status ?? 0);
