#!/usr/bin/env node
/**
 * Vitest per-file duration report for quarterly test audits.
 * Usage: npm run report:test-duration [-- --out docs/test-duration-baseline.json]
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outArg = process.argv.indexOf('--out');
const outPath =
  outArg >= 0 ? process.argv[outArg + 1] : 'docs/test-duration-baseline.json';

const jsonPath = path.join(process.cwd(), '.test-duration-report.json');
execSync(`npx vitest run --reporter=json --outputFile="${jsonPath}"`, {
  stdio: 'inherit',
  env: { ...process.env, FAST_TESTS: 'true' },
});

const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
fs.unlinkSync(jsonPath);

const byApp = {};
const byFile = [];

for (const task of report.testResults ?? []) {
  const rel = task.name.replace(process.cwd() + path.sep, '');
  const appMatch = rel.match(/^src\/([^/]+)\//);
  const app = appMatch?.[1] ?? 'other';
  const duration = task.endTime - task.startTime;
  byFile.push({ file: rel, app, durationMs: duration });
  byApp[app] = (byApp[app] ?? 0) + duration;
}

byFile.sort((a, b) => b.durationMs - a.durationMs);

const appEntries = Object.entries(byApp).sort((a, b) => b[1] - a[1]);
const median =
  appEntries.length > 0
    ? appEntries[Math.floor(appEntries.length / 2)][1]
    : 0;
const flagged = appEntries.filter(([, ms]) => ms > median * 2);

const summary = {
  generatedAt: new Date().toISOString(),
  totalFiles: byFile.length,
  totalDurationMs: byFile.reduce((s, f) => s + f.durationMs, 0),
  byApp: Object.fromEntries(appEntries.map(([app, ms]) => [app, ms])),
  medianAppDurationMs: median,
  flaggedApps: Object.fromEntries(flagged),
  slowestFiles: byFile.slice(0, 20),
};

fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log(`test-duration-report: wrote ${outPath}`);
console.log(`Total: ${(summary.totalDurationMs / 1000).toFixed(1)}s across ${summary.totalFiles} files`);
if (flagged.length > 0) {
  console.log('Apps >2× median:', flagged.map(([a]) => a).join(', '));
}
