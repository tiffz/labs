#!/usr/bin/env node
/**
 * CI gating invariant: every job that gates the Pages deploy MUST also be a required
 * status check on `main`.
 *
 * Why: `ci.yml`'s `deploy` job runs `needs: [...]`. If a job in that list is NOT a
 * required status check, a PR can merge green (branch protection only enforces the
 * required set) while that job is red — then on the `main` push `deploy` is SKIPPED
 * because one of its `needs` failed. The deploy silently does not happen and prod
 * goes stale with no red X. This is how #120/#121 merged but never deployed
 * (`react-hooks-ratchet` gated the deploy but was not a required check).
 *
 * This script can only read the repo, not GitHub branch protection. So it enforces the
 * repo half of the invariant: `deploy.needs` must equal REQUIRED_CHECKS below. Keeping
 * that list, the branch-protection required checks, and docs/CI_RELIABILITY.md in sync
 * is the human half — the doc carries the exact `gh api` command to set them.
 *
 * When you change `deploy.needs`: update REQUIRED_CHECKS here, run the `gh api` command
 * in docs/CI_RELIABILITY.md to match branch protection, and update the doc's list.
 */
import { readFileSync } from 'node:fs';

// The canonical gating set. MUST equal ci.yml deploy.needs AND the `main` branch-protection
// required status checks. `scope` is excluded (a needs-dependency of the test jobs, not a
// deploy gate). `react-hooks-ratchet` is excluded on purpose: it is an advisory debt ratchet
// (visible on the PR, ratchet-down by design), not a ship gate — keeping it out of deploy.needs
// is what stops a green PR from silently skipping the deploy.
const REQUIRED_CHECKS = ['build', 'checks', 'e2e', 'vitest'];

const ciPath = '.github/workflows/ci.yml';
const doc = 'docs/CI_RELIABILITY.md';

function fail(msg) {
  console.error(`check:ci-gating: ${msg}`);
  process.exit(1);
}

const ci = readFileSync(ciPath, 'utf8');

// Extract the `deploy:` job block (from `  deploy:` to the next top-level `  <job>:` or EOF).
const deployStart = ci.search(/^ {2}deploy:\s*$/m);
if (deployStart === -1) fail(`no deploy job found in ${ciPath}`);
const rest = ci.slice(deployStart + 1);
const nextJob = rest.search(/^ {2}[a-z0-9_-]+:\s*$/m);
const deployBlock = nextJob === -1 ? rest : rest.slice(0, nextJob);

// deploy.needs is written inline: `needs: [a, b, c]`.
const needsMatch = deployBlock.match(/^\s*needs:\s*\[([^\]]*)\]/m);
if (!needsMatch) fail('deploy job has no inline `needs: [...]` array — cannot verify gating');
const deployNeeds = needsMatch[1]
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .sort();

const expected = [...REQUIRED_CHECKS].sort();
const missing = expected.filter((c) => !deployNeeds.includes(c));
const extra = deployNeeds.filter((c) => !expected.includes(c));

if (missing.length || extra.length) {
  const lines = [
    'deploy.needs does not match the canonical required-checks set.',
    `  deploy.needs : [${deployNeeds.join(', ')}]`,
    `  expected     : [${expected.join(', ')}]`,
  ];
  if (missing.length) lines.push(`  deploy is missing: ${missing.join(', ')}`);
  if (extra.length) lines.push(`  deploy has extra:  ${extra.join(', ')}`);
  lines.push(
    'If this change is intended, update REQUIRED_CHECKS in scripts/check-ci-gating.mjs,',
    'the required status checks on `main` (see docs/CI_RELIABILITY.md § Required status checks),',
    'and the list in that doc — all three must agree.',
  );
  fail(lines.join('\n'));
}

// The doc must name every gating job, so the human-maintained branch-protection list stays honest.
const docText = readFileSync(doc, 'utf8');
const undocumented = expected.filter((c) => !docText.includes(c));
if (undocumented.length) {
  fail(
    `${doc} does not mention required check(s): ${undocumented.join(', ')}. ` +
      'The doc must list every deploy-gating job so branch protection can be kept in sync.',
  );
}

console.log(
  `check:ci-gating: ok (deploy.needs == required checks: ${expected.join(', ')}; documented in ${doc})`,
);
