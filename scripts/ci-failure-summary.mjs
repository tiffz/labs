#!/usr/bin/env node
/**
 * Classify a GitHub Actions run failure by step name.
 *
 * Usage:
 *   node scripts/ci-failure-summary.mjs <run-id>
 *   npm run report:ci-failure -- <run-id>
 */
import { execSync } from 'node:child_process';

const runId = process.argv[2];
if (!runId) {
  console.error('Usage: node scripts/ci-failure-summary.mjs <run-id>');
  process.exit(1);
}

function ghJson(cmd) {
  return JSON.parse(execSync(cmd, { encoding: 'utf8' }));
}

const jobs = ghJson(`gh run view ${runId} --json jobs -q '.jobs'`);
const run = ghJson(`gh run view ${runId} --json conclusion,status,url,headBranch,event,createdAt`);

console.log(`# CI failure summary — run ${runId}\n`);
console.log(`URL: ${run.url}`);
console.log(`Branch: ${run.headBranch} · Event: ${run.event} · Conclusion: ${run.conclusion}\n`);

const BUCKETS = [
  { label: 'import-boundaries', re: /import boundaries/i },
  { label: 'lint', re: /^Run linter$|eslint/i },
  { label: 'typecheck', re: /typecheck/i },
  { label: 'knip', re: /knip|dead code/i },
  { label: 'vitest', re: /Run tests|vitest/i },
  { label: 'e2e', re: /e2e|playwright|smoke/i },
  { label: 'build', re: /Build project|vite build/i },
  { label: 'deploy', re: /Deploy|Pages/i },
  { label: 'visual', re: /visual regression/i },
  { label: 'docs-check', re: /doc link|agent doc|ui copy|css important|workflow guard/i },
];

for (const job of jobs) {
  console.log(`## Job: ${job.name} (${job.conclusion})\n`);
  const steps = job.steps ?? [];
  const failed = steps.filter((s) => s.conclusion === 'failure');
  if (failed.length === 0) {
    console.log('No failed steps in this job.\n');
    continue;
  }
  for (const step of failed) {
    const bucket = BUCKETS.find((b) => b.re.test(step.name))?.label ?? 'other';
    console.log(`- **${bucket}**: ${step.name}`);
  }
  console.log('');
}

console.log('See docs/CI_RELIABILITY.md and docs/FLAKY_TEST_REGISTRY.md for triage playbooks.');
