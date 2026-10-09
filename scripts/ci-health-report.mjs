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
const failBelow = Number(args.find((_, i, a) => a[i - 1] === '--fail-below') ?? NaN);

/**
 * Exit code for "could not measure". Distinct from 1 ("measured, and below the gate") so the weekly
 * workflow never files a "CI success rate below 90%" issue for a GitHub outage. On 2026-10-05 the
 * runs API returned HTTP 502, this script exited 1, and the workflow reported low CI health for a
 * week whose health it never read.
 */
const EXIT_UNMEASURED = 2;

/** 5xx and network failures are worth a retry; auth and 4xx are not. */
function isTransientGhError(msg) {
  return /HTTP 5\d\d|ECONNRESET|ETIMEDOUT|EAI_AGAIN|timed out|connection reset/i.test(msg);
}

function ghJson(cmd, attempts = 4) {
  for (let attempt = 1; ; attempt++) {
    try {
      return JSON.parse(execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }));
    } catch (e) {
      const msg = e.stderr?.toString?.() || e.message;
      if (attempt < attempts && isTransientGhError(msg)) {
        const waitS = 5 * 2 ** (attempt - 1);
        console.error(`ci-health-report: gh failed (attempt ${attempt}/${attempts}), retrying in ${waitS}s — ${msg.trim()}`);
        execSync(`sleep ${waitS}`);
        continue;
      }
      console.error(`ci-health-report: could not read CI runs — ${msg.trim()}`);
      console.error('This is a measurement failure, not a health result. Install and auth gh: https://cli.github.com/');
      process.exit(EXIT_UNMEASURED);
    }
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

/**
 * Minimum actionable runs before a PERCENTAGE gate means anything.
 *
 * The weekly window saw 9 actionable runs with 1 e2e failure: 88.9%, which trips a 90% gate and
 * files a "CI success rate below 90%" issue telling the next session to drop everything for flake
 * triage. But 1-in-9 cannot land above 90% — at this sample size the gate fires on ANY single
 * failure, so it reports "the success rate is low" when the truth is "one run failed". It measures
 * sample size, not health.
 *
 * Below this, report the numbers and pass. A single failure is a thing to look at, not a trend, and
 * a gate that cries every week is one nobody reads.
 */
const MIN_RUNS_FOR_RATE_GATE = 20;

if (Number.isFinite(failBelow) && actionable.length > 0 && actionable.length < MIN_RUNS_FOR_RATE_GATE) {
  const rate = (success.length / actionable.length) * 100;
  console.log(
    `\nci-health-report: ${actionable.length} actionable run(s) is too few for a percentage gate ` +
      `(need ${MIN_RUNS_FOR_RATE_GATE}). Rate ${rate.toFixed(1)}% reported, not enforced.`,
  );
  if (failure.length > 0) {
    console.log(
      `ci-health-report: ${failure.length} failure(s) in the window — triage them individually ` +
        `with \`npm run report:ci-failure -- <run-id>\`, above.`,
    );
  }
} else if (Number.isFinite(failBelow) && actionable.length > 0) {
  const rate = (success.length / actionable.length) * 100;
  if (rate < failBelow) {
    console.error(`\nci-health-report: success rate ${rate.toFixed(1)}% is below ${failBelow}% gate`);
    process.exit(1);
  }
}
