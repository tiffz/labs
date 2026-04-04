#!/usr/bin/env node
/**
 * Deletes all PNG files under e2e/visual/apps.visual.spec.ts-snapshots/, then runs
 * the same Playwright command as `npm run test:e2e:visual:update`.
 *
 * Use when you want a clean-slate baseline refresh (e.g. after pipeline/tooling fixes),
 * not for typical single-route updates (use `test:e2e:visual:update` or Playwright UI).
 */
import { readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const snapDir = join(root, 'e2e/visual/apps.visual.spec.ts-snapshots');

if (!existsSync(snapDir)) {
  console.error(`Missing snapshot directory: ${snapDir}`);
  process.exit(1);
}

let removed = 0;
for (const name of readdirSync(snapDir)) {
  if (name.endsWith('.png')) {
    unlinkSync(join(snapDir, name));
    removed += 1;
  }
}

console.log(`Removed ${removed} baseline PNG(s). Regenerating with Playwright...\n`);

execSync('npm run test:e2e:visual:update', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env },
});
