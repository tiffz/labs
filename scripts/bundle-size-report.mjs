#!/usr/bin/env node
/**
 * Advisory bundle size report — warns when app entry chunks grow >10% vs baseline.
 * Usage: npm run report:bundle-size
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASELINE_PATH = path.join(process.cwd(), 'docs/bundle-size-baseline.json');
const THRESHOLD = 0.1;

execSync('npm run build', { stdio: 'inherit' });

const distAssets = path.join(process.cwd(), 'dist/assets');
if (!fs.existsSync(distAssets)) {
  console.error('bundle-size-report: dist/assets not found after build');
  process.exit(1);
}

const entries = {};
for (const file of fs.readdirSync(distAssets)) {
  const m = file.match(/^index-([a-z0-9]+)\.js$/);
  if (m) {
    const stat = fs.statSync(path.join(distAssets, file));
    entries['labs-home'] = stat.size;
    continue;
  }
  const appMatch = file.match(/^([^/]+)-index-([a-z0-9]+)\.js$/);
  if (appMatch) {
    const app = appMatch[1];
    const stat = fs.statSync(path.join(distAssets, file));
    entries[app] = stat.size;
  }
}

let baseline = {};
if (fs.existsSync(BASELINE_PATH)) {
  baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
}

console.log('# Bundle size report (advisory)\n');
let warnings = 0;
for (const [app, bytes] of Object.entries(entries).sort((a, b) => b[1] - a[1])) {
  const prev = baseline[app];
  const kb = (bytes / 1024).toFixed(1);
  if (prev && bytes > prev * (1 + THRESHOLD)) {
    const pct = (((bytes - prev) / prev) * 100).toFixed(1);
    console.log(`::warning title=Bundle growth::${app} ${kb} KiB (+${pct}% vs baseline)`);
    warnings++;
  } else {
    console.log(`${app}: ${kb} KiB`);
  }
}

if (!fs.existsSync(BASELINE_PATH)) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(entries, null, 2));
  console.log(`\nWrote baseline ${BASELINE_PATH}`);
} else if (process.argv.includes('--update-baseline')) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(entries, null, 2));
  console.log(`\nUpdated baseline ${BASELINE_PATH}`);
}

console.log(`\n${warnings} app(s) exceeded ${THRESHOLD * 100}% growth threshold (advisory only).`);
