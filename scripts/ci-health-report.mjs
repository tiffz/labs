#!/usr/bin/env node
/**
 * CI health baseline — success rate and median duration for CI/CD workflow runs.
 * Requires `gh` CLI authenticated to the repo.
 *
 * Usage:
 *   node scripts/ci-health-report.mjs [--days 30] [--workflow ci.yml]
 *   npm run report:ci-health
 */
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const days = Number(args.find((_, i, a) => a[i - 1] === '--days') ?? 30);
const workflowFile = args.find((_, i, a) => a[i - 1] === '--workflow') ?? 'ci.yml';

function ghJson(cmd) {
  try {
    return JSON.parse(execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }));
  } catch (e) {
    const msg = e.stderr?.toString?.() ?? e.message;
    console.error(`ci-health-report: gh failed — ${msg}`);
    console.error('Install and auth gh: https://cli.github.com/');
    process.exit(1);
  }
}

const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const runs = ghJson(
  `gh run list --workflow=${workflowFile} --limit 200 --json databaseId,conclusion,status,createdAt,updatedAt,event,headBranch`
).filter((r) => r.createdAt >= since);

const completed = runs.filter((r) => r.status === 'completed');
const cancelled = completed.filter((r) => r.conclusion === 'cancelled');
const actionable = completed.filter((r) => r.conclusion !== 'cancelled');
const success = actionable.filter((r) => r.conclusion === 'success');
const failure = actionable.filter((r) => r.conclusion === 'failure');

function durationMs(run) {
  return new Date(run.updatedAt) - new Date(run.createdAt);
}

const durations = actionable.map(durationMs).sort((a, b) => a - b);
const medianMs = durations.length
  ? durations[Math.floor(durations.length / 2)]
  : 0;

const successRate = actionable.length
  ? ((success.length / actionable.length) * 100).toFixed(1)
  : 'n/a';

console.log(`# CI health report (${workflowFile}, last ${days} days)\n`);
console.log(`| Metric | Value |`);
console.log(`| --- | --- |`);
console.log(`| Total completed runs | ${completed.length} |`);
console.log(`| Cancelled (exclude from rate) | ${cancelled.length} |`);
console.log(`| Actionable runs | ${actionable.length} |`);
console.log(`| Success | ${success.length} |`);
console.log(`| Failure | ${failure.length} |`);
console.log(`| **Success rate (excl. cancelled)** | **${successRate}%** |`);
console.log(`| Median duration (actionable) | ${(medianMs / 60_000).toFixed(1)} min |`);
console.log('');

if (failure.length > 0) {
  console.log('## Recent failures (up to 10)\n');
  for (const run of failure.slice(0, 10)) {
    console.log(`- run ${run.databaseId} (${run.headBranch}, ${run.event}) — ${run.createdAt.slice(0, 10)}`);
    console.log(`  Triage: node scripts/ci-failure-summary.mjs ${run.databaseId}`);
  }
}

console.log('\nTarget: >90% success rate (excl. cancelled). See docs/ENGINEERING_HEALTH.md');
