#!/usr/bin/env node
/**
 * Parallel presubmit — same gate as scripts/presubmit.sh ran sequentially,
 * restructured into dependency stages so independent checks share the wall
 * clock. Target: ≤300s (was ~420s sequential; see docs/CI_PATH_SCOPING.md).
 *
 * Stages:
 *   1. Static checks (scripts + lint + typecheck + knip) — all parallel.
 *   2. Diff classification — docs-only diffs stop here.
 *   3. Build ∥ scoped Vitest (independent of each other).
 *   4. Scoped e2e smoke — alone, so interaction-latency budgets aren't
 *      skewed by concurrent CPU load.
 *
 * Output per task is buffered and printed on completion, so logs stay
 * readable despite concurrency.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const startedAt = Date.now();

function runTask(name, command, args) {
  return new Promise((resolve) => {
    const taskStart = Date.now();
    const child = spawn(command, args, { env: process.env });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    child.on('close', (code) => {
      const secs = ((Date.now() - taskStart) / 1000).toFixed(1);
      const status = code === 0 ? 'ok' : `FAILED (exit ${code})`;
      console.log(`\n== presubmit: ${name} — ${status} in ${secs}s ==`);
      if (code !== 0) {
        console.log(output.trimEnd());
      }
      resolve({ name, code, output });
    });
  });
}

const npmRun = (name, script) => () => runTask(name, 'npm', ['run', '--silent', script]);

async function runStage(label, taskFactories) {
  console.log(`\n=== presubmit stage: ${label} ===`);
  const results = await Promise.all(taskFactories.map((f) => f()));
  const failed = results.filter((r) => r.code !== 0);
  if (failed.length > 0) {
    console.error(`\npresubmit: stage "${label}" failed: ${failed.map((f) => f.name).join(', ')}`);
    process.exit(1);
  }
}

const staticChecks = [
  npmRun('import boundaries', 'check:import-boundaries'),
  npmRun('ui copy', 'check:ui-copy'),
  npmRun('doc links', 'check:doc-links'),
  npmRun('agent docs', 'check:agent-docs'),
  npmRun('shared theme contract', 'check:shared-theme-contract'),
  npmRun('chrome UI contract', 'check:chrome-ui'),
  npmRun('menu a11y contract', 'check:menu-a11y'),
  npmRun('volume slider contract', 'check:volume-slider'),
  npmRun('app quality contract', 'check:app-quality'),
  npmRun('css important baseline', 'check:css-important'),
  npmRun('css import order', 'check:css-import-order'),
  npmRun('workflow guardrails', 'check:workflows'),
  npmRun('shared catalog current', 'check:shared-catalog'),
  npmRun('labs catalog current', 'check:labs-catalog'),
  npmRun('knip config comments', 'check:knip-config'),
  npmRun('lint', 'lint'),
  npmRun('knip', 'knip'),
  npmRun('typecheck', 'typecheck'),
];
if (existsSync('src/muscle/main.tsx')) {
  staticChecks.push(npmRun('muscle public assets', 'muscle:validate-assets'));
}

await runStage('static checks (parallel)', staticChecks);

const classResult = spawnSync('node', ['scripts/diff-change-class.mjs', '--json'], {
  encoding: 'utf8',
});
let changeClass = 'default';
try {
  changeClass = JSON.parse(classResult.stdout).classification || 'default';
} catch {
  /* default */
}
console.log(`\n== presubmit: diff class = ${changeClass} ==`);

if (changeClass === 'docs-only') {
  console.log('presubmit: docs-only diff — skipping build, Vitest, and e2e (see docs/CI_PATH_SCOPING.md)');
  finish(0);
}

const buildAndTests = [npmRun('production build', 'build')];
if (changeClass !== 'e2e-only') {
  buildAndTests.push(npmRun('test:changed-apps (scoped Vitest vs main)', 'test:changed-apps'));
} else {
  console.log('presubmit: skipping test:changed-apps (e2e-only diff)');
}
await runStage('build + scoped Vitest (parallel)', buildAndTests);

await runStage('bundle size gate', [
  () => runTask('bundle size gate', 'node', ['scripts/bundle-size-report.mjs', '--skip-build', '--check']),
]);

await runStage('scoped e2e smoke', [npmRun('scoped e2e smoke', 'test:e2e:scoped')]);

finish(0);

function finish(code) {
  const totalSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\npresubmit: all checks passed (${totalSec}s)`);
  process.exit(code);
}
