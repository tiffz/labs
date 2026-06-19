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

const regions = ['fundamentals', 'torso', 'shoulder_neck', 'arm', 'hand', 'leg', 'foot'];

if (!fs.existsSync(blend)) {
  console.error('Missing Z-Anatomy blend file:', blend);
  console.error('Download and extract to tools/muscle-anatomy/data/ first.');
  process.exit(1);
}

console.log(`Using Blender: ${blender}`);

for (const region of regions) {
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
      '--ratio',
      '0.2',
      '--max-tris',
      '25000',
      '--max-region-tris',
      '80000',
    ],
    { stdio: 'inherit', cwd: root },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('\nRunning muscle:validate-assets…');
const validate = spawnSync('npm', ['run', 'muscle:validate-assets'], { stdio: 'inherit', cwd: root, shell: true });
process.exit(validate.status ?? 0);
