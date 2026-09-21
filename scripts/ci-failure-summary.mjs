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
  // Dependency install. Named explicitly because it is NOT a test failure and must not be
  // triaged as one: it kills every job before anything runs, so the run looks catastrophic while
  // the cause is a single unsatisfiable version range.
  { label: 'install', re: /setup project|install dependencies|npm ci/i },
];

/**
 * Pull the real reason out of a failed install step.
 *
 * Step names alone cannot distinguish "npm could not resolve a peer range" from any other setup
 * problem, and the difference decides the whole triage path. Issue #178 ("CI success rate below
 * 90%") sat open sending people to flake triage while all five failures were one peer conflict —
 * @react-three/fiber capping React below 19.3 — visible only in the log.
 */
function describeInstallFailure(jobId) {
  let log = '';
  try {
    log = execSync(`gh api repos/{owner}/{repo}/actions/jobs/${jobId}/logs`, {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return null;
  }
  if (!/ERESOLVE/.test(log)) {
    const generic = log.match(/npm error .*/g);
    return generic ? generic.slice(0, 4).join('\n') : null;
  }
  const lines = log.split('\n').map((l) => l.replace(/^\S+\s/, ''));
  const start = lines.findIndex((l) => /ERESOLVE could not resolve/.test(l));
  const detail = lines.slice(start, start + 40).filter((l) => l.startsWith('npm error'));
  const found = detail.find((l) => /^npm error Found:/.test(l));
  /*
   * Anchor on "Could not resolve dependency:". The peer lines ABOVE it are the ranges that are
   * satisfied, printed as context — reporting one of those names an innocent package and sends
   * the reader to the wrong dependency entirely.
   */
  const conflictAt = detail.findIndex((l) => /Could not resolve dependency:/.test(l));
  const peer =
    conflictAt >= 0 ? detail.slice(conflictAt + 1).find((l) => /peer .* from /.test(l)) : undefined;
  return [
    'Dependency RESOLUTION failure — not a flaky test.',
    found ? `  ${found.replace('npm error ', '')}` : null,
    peer ? `  ${peer.replace('npm error ', '')}` : null,
    '  Fix: hold the bumped package at a version the peer range allows, or upgrade the',
    '  package that declares the peer. Do NOT use --legacy-peer-deps: it turns an install',
    '  error into a runtime one.',
  ]
    .filter(Boolean)
    .join('\n');
}

const failedJobs = jobs.filter((j) => j.conclusion === 'failure');
const bucketsSeen = new Set();
let installJobId = null;

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
    bucketsSeen.add(bucket);
    if (bucket === 'install' && installJobId == null) installJobId = job.databaseId ?? job.id;
    console.log(`- **${bucket}**: ${step.name}`);
  }
  console.log('');
}

// Every job failing at install reads as a catastrophic run but is one unsatisfiable range. Say so
// before the reader opens the flake playbook.
if (installJobId != null && bucketsSeen.size === 1 && bucketsSeen.has('install')) {
  console.log('## Root cause\n');
  console.log(
    `All ${failedJobs.length} failed job(s) died during dependency install, before any test ran.\n`,
  );
  const detail = describeInstallFailure(installJobId);
  console.log(detail ?? 'Could not read the install log; open the job and look for `npm error`.');
  console.log('');
}

console.log('See docs/CI_RELIABILITY.md and docs/FLAKY_TEST_REGISTRY.md for triage playbooks.');
