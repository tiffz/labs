#!/usr/bin/env node
/**
 * Fetch a CI run's visual diffs for review, and import them once reviewed.
 *
 * An intended UI change always fails the blocking visual step once: baselines are Linux-only
 * (docs/VISUAL_REGRESSION_AGENT.md) and there is no local Linux renderer without Docker. Four of
 * the five CI failures in the last week of October 2026 were that, each followed by the same
 * hand-run steps: find the run, download the artifact, find the diffs, import. This is those steps.
 *
 *   node scripts/review-visual-diffs.mjs [run-id]            # download + list diffs to review
 *   node scripts/review-visual-diffs.mjs [run-id] --import   # then copy the actuals into baselines
 *
 * With no run id, it takes the newest failed CI/CD run on the current branch. Importing never
 * happens without --import: judge every diff first (skill labs-visual-judge).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const doImport = args.includes('--import');
const passthrough = args.filter((a) => a === '--include-new');
const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8' }).trim();

let runId = args.find((a) => /^\d+$/.test(a));
if (!runId) {
  const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
  runId = gh('run', 'list', '--workflow', 'CI/CD', '--branch', branch, '--status', 'failure', '--limit', '1', '--json', 'databaseId', '--jq', '.[0].databaseId');
  if (!runId) {
    console.error(`review-visual-diffs: no failed CI/CD run on ${branch}. Pass a run id.`);
    process.exit(1);
  }
}

const dir = mkdtempSync(path.join(tmpdir(), `labs-visual-${runId}-`));
gh('run', 'download', runId, '-n', 'visual-regression-artifacts', '-D', dir);

function walk(d, out = []) {
  for (const name of readdirSync(d)) {
    const p = path.join(d, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('-diff.png')) out.push(p);
  }
  return out;
}
const diffs = walk(dir);
console.log(`Run ${runId}: ${diffs.length} visual diffs. Review each actual / expected / diff trio:`);
for (const d of diffs) console.log(`  ${path.dirname(d)}`);

if (!doImport) {
  console.log('\nOnce every diff is judged intended (rubric tier 2), re-run with --import.');
  process.exit(0);
}
execFileSync('node', ['scripts/import-visual-baselines-from-artifacts.mjs', path.join(dir, 'test-results'), ...passthrough], {
  stdio: 'inherit',
});
