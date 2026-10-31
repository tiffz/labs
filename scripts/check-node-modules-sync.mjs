#!/usr/bin/env node
/**
 * Does `node_modules` hold the versions `package-lock.json` names?
 *
 * Every local gate runs whatever is installed, and nothing re-installs after a pull. On
 * 2026-10-31 all 38 checkouts of this repo had drifted, by 127 to 1063 packages: this one ran
 * Playwright 1.63 and MUI 9.4 while CI ran 1.64 and 9.5. A local result from a different
 * toolchain is not evidence about CI, so failures there read as "environmental" and got waved
 * through, and real ones got blamed on the machine (`local-ci-gate-drift`).
 *
 *   node scripts/check-node-modules-sync.mjs          # report drift, exit 1
 *   node scripts/check-node-modules-sync.mjs --fix    # run `npm ci` when drifted (~15s warm)
 *
 * Only top-level packages are compared: they are what the gates import, and reading ~1000
 * package.json files takes well under a second.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const fix = process.argv.includes('--fix');

function installedVersion(pkgPath) {
  try {
    return JSON.parse(readFileSync(path.join(root, pkgPath, 'package.json'), 'utf8')).version ?? null;
  } catch {
    return null;
  }
}

/** Top-level packages whose installed version differs from the lockfile. */
function listDrift() {
  const lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const drift = [];
  for (const [key, entry] of Object.entries(lock.packages ?? {})) {
    if (!key.startsWith('node_modules/') || key.lastIndexOf('node_modules/') !== 0) continue;
    // Optional platform binaries (another OS's esbuild, rollup, …) are never installed here.
    if (entry.optional) continue;
    const installed = installedVersion(key);
    if (installed !== entry.version) drift.push({ name: key.slice('node_modules/'.length), installed, locked: entry.version });
  }
  return drift;
}

const drift = listDrift();
if (drift.length === 0) process.exit(0);

const sample = drift
  .slice(0, 5)
  .map((d) => `${d.name} ${d.installed ?? 'missing'} (lockfile ${d.locked})`)
  .join(', ');
const summary = `${drift.length} installed packages differ from package-lock.json: ${sample}${drift.length > 5 ? ', …' : ''}`;

if (!fix) {
  console.error(`check:node-modules-sync: ${summary}\nRun: npm ci`);
  process.exit(1);
}

console.log(`check:node-modules-sync: ${summary}\nRunning npm ci so local gates match CI…`);
execSync('npm ci --prefer-offline --no-audit --no-fund', { cwd: root, stdio: 'inherit' });
const left = listDrift();
if (left.length > 0) {
  console.error(`check:node-modules-sync: still ${left.length} packages off after npm ci.`);
  process.exit(1);
}
