#!/usr/bin/env node
/**
 * Per-app bundle size gate. Measures the **eager JS** each app shell loads
 * (entry chunk + modulepreloads referenced from its built index.html) in raw
 * and gzip bytes, then applies a two-tier gate vs docs/bundle-size-baseline.json:
 *
 *   - growth > 10% (gzip)          → warning (advisory)
 *   - growth > 25% (gzip)          → FAIL
 *   - gzip total > absolute cap    → FAIL (optional CAP_EXEMPTIONS set below; prefer empty)
 *
 * Baseline updates land in the same PR as the growth they justify:
 *   npm run report:bundle-size -- --update-baseline
 *
 * Prefer calibrating `--update-baseline` from **CI Linux** gzip sizes (build job
 * log or a Linux runner). macOS local gzip is often ~15–25% smaller and will
 * trip the 25% growth fail tier on Ubuntu CI even when absolute sizes are fine.
 *
 * Usage: npm run report:bundle-size [-- --skip-build --update-baseline --check]
 * `--check` exits non-zero on FAIL tier (used by CI build job).
 *
 * See docs/PERFORMANCE_BUDGETS.md for the canonical budget table.
 */
import { execSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

const BASELINE_PATH = path.join(process.cwd(), 'docs/bundle-size-baseline.json');
const WARN_GROWTH = 0.1;
const FAIL_GROWTH = 0.25;
/** Absolute per-app cap on eager gzip JS (bytes). */
const ABSOLUTE_GZIP_CAP = 2 * 1024 * 1024;
/**
 * Apps temporarily over the absolute cap. Each entry must reference a tracked
 * work item; remove the entry when the app is brought under the cap.
 */
/** Apps temporarily over the absolute cap. Prefer empty — route-split instead. */
const CAP_EXEMPTIONS = new Set([]);

const skipBuild = process.argv.includes('--skip-build');
const updateBaseline = process.argv.includes('--update-baseline');
const checkMode = process.argv.includes('--check');

if (!skipBuild) {
  execSync('npm run build', { stdio: 'inherit' });
}

const dist = path.join(process.cwd(), 'dist');
const distJs = path.join(dist, 'js');
if (!fs.existsSync(distJs)) {
  console.error('bundle-size-report: dist/js not found after build');
  process.exit(1);
}

/** dist-relative js paths referenced by an app's index.html (entry + preloads). */
function eagerJsRefs(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const refs = new Set();
  for (const m of html.matchAll(/(?:src|href)="(\/(?:js|scripts)\/[^"]+\.js)"/g)) {
    refs.add(m[1]);
  }
  return [...refs];
}

function appHtmlFiles() {
  const apps = {};
  const rootHtml = path.join(dist, 'index.html');
  if (fs.existsSync(rootHtml)) apps['labs-home'] = rootHtml;
  for (const entry of fs.readdirSync(dist, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'js' || entry.name === 'assets') continue;
    const html = path.join(dist, entry.name, 'index.html');
    if (fs.existsSync(html)) apps[entry.name] = html;
  }
  return apps;
}

function measure(htmlPath) {
  let raw = 0;
  let gzip = 0;
  for (const ref of eagerJsRefs(htmlPath)) {
    const file = path.join(dist, ref.replace(/^\//, ''));
    if (!fs.existsSync(file)) continue;
    raw += fs.statSync(file).size;
    const gz = `${file}.gz`;
    gzip += fs.existsSync(gz) ? fs.statSync(gz).size : gzipSync(fs.readFileSync(file)).length;
  }
  return { raw, gzip };
}

const entries = {};
for (const [app, html] of Object.entries(appHtmlFiles())) {
  const sizes = measure(html);
  // Redirect stubs (beat, pulse, palettegen) reference no JS — skip them.
  if (sizes.raw === 0) continue;
  entries[app] = sizes;
}

let baseline = {};
if (fs.existsSync(BASELINE_PATH)) {
  baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
}

const kib = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;

console.log('# Bundle size report (eager JS per app: entry + modulepreloads)\n');
let warnings = 0;
let failures = 0;
for (const [app, { raw, gzip }] of Object.entries(entries).sort((a, b) => b[1].gzip - a[1].gzip)) {
  const prev = baseline[app]?.gzip;
  if (prev && gzip > prev * (1 + FAIL_GROWTH)) {
    const pct = (((gzip - prev) / prev) * 100).toFixed(1);
    console.log(`::error title=Bundle growth::${app} gzip ${kib(gzip)} (+${pct}% vs baseline — exceeds ${FAIL_GROWTH * 100}% fail tier)`);
    failures++;
    continue;
  }
  if (prev && gzip > prev * (1 + WARN_GROWTH)) {
    const pct = (((gzip - prev) / prev) * 100).toFixed(1);
    console.log(`::warning title=Bundle growth::${app} gzip ${kib(gzip)} (+${pct}% vs baseline)`);
    warnings++;
    continue;
  }
  if (gzip > ABSOLUTE_GZIP_CAP && !CAP_EXEMPTIONS.has(app)) {
    console.log(`::error title=Bundle cap::${app} gzip ${kib(gzip)} exceeds the ${kib(ABSOLUTE_GZIP_CAP)} absolute cap`);
    failures++;
    continue;
  }
  console.log(`${app}: ${kib(gzip)} gzip (${kib(raw)} raw)`);
}

if (!fs.existsSync(BASELINE_PATH) || updateBaseline) {
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(entries, null, 2)}\n`);
  console.log(`\nWrote baseline ${BASELINE_PATH}`);
}

console.log(`\n${warnings} warning(s), ${failures} failure(s) (warn >${WARN_GROWTH * 100}%, fail >${FAIL_GROWTH * 100}% or ${kib(ABSOLUTE_GZIP_CAP)} cap).`);
if (checkMode && failures > 0) {
  process.exit(1);
}
